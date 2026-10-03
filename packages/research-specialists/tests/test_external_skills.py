"""Behavioral tests for adapted research helpers; all provider responses are local fixtures."""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import research_policy


def load_helper(skill, filename):
    path = ROOT / "skills" / skill / "scripts" / filename
    sys.path.insert(0, str(path.parent))
    # Upstream helpers use the same local module name in two separate skills.
    sys.modules.pop("_common", None)
    name = skill.replace("-", "_") + "_" + path.stem
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class AdaptedResearchHelpersTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.manuscript = self.directory / "manuscript"
        self.manuscript.mkdir()
        self.policy_path = self.directory / "authorization.json"
        self.policy = {
            "version": 1,
            "authorizationReference": "local synthetic regression fixture",
            "purpose": "Verify file and provider boundaries without external calls",
            "readRoots": [str(self.directory), str(ROOT)],
            "writeRoots": [str(self.directory)],
            "network": {"rules": []},
            "credentials": {"allowedEnvironmentVariables": [], "files": []},
        }
        self.save_policy()
        self.environment = patch.dict(os.environ, {
            "AGENT_FORGE_RESEARCH_AUTHORIZATION": str(self.policy_path),
            "MPLBACKEND": "Agg",
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        research_policy._credential_values.clear()

    def save_policy(self):
        self.policy_path.write_text(json.dumps(self.policy), encoding="utf-8")

    def write(self, name, content):
        path = self.manuscript / name
        path.write_text(content, encoding="utf-8")
        return path

    def test_latex_nested_inputs_and_real_quote_check_remain_functional(self):
        checker = load_helper("nature-response", "check_package_consistency.py")
        prose = "The independent validation dataset contains the observations described in the approved protocol."
        self.write("methods.tex", prose)
        manuscript = self.write("main.tex", r"\input{methods}")
        response = self.write("response.tex", r"\ReviewerComment{Explain validation.}\AuthorResponse{See Methods.}\RevisedExcerpt{" + prose + "}")
        self.assertEqual(checker.run_checks(manuscript, response), [])

    def test_latex_include_cannot_leave_manuscript_root_even_if_read_root_is_broader(self):
        checker = load_helper("nature-response", "check_package_consistency.py")
        (self.directory / "private.txt").write_text("private data", encoding="utf-8")
        manuscript = self.write("main.tex", r"\input{../private.txt}")
        with self.assertRaisesRegex(ValueError, "leaves"):
            checker.read_latex_project(manuscript)

    def test_latex_absolute_paths_and_cycles_are_rejected(self):
        checker = load_helper("nature-response", "check_package_consistency.py")
        included = self.write("part.tex", "Example text")
        manuscript = self.write("main.tex", "\\input{" + included.as_posix() + "}")
        with self.assertRaisesRegex(ValueError, "Absolute"):
            checker.read_latex_project(manuscript)
        manuscript.write_text(r"\input{main}", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Cyclic"):
            checker.read_latex_project(manuscript)

    def test_latex_depth_and_expanded_bytes_are_bounded(self):
        checker = load_helper("nature-response", "check_package_consistency.py")
        for index in range(25):
            self.write(f"part{index}.tex", f"\\input{{part{index + 1}}}" if index < 24 else "Done")
        with self.assertRaisesRegex(ValueError, "depth"):
            checker.read_latex_project(self.manuscript / "part0.tex")
        huge = self.write("huge.tex", "a" * (8 * 1024 * 1024 + 1))
        with self.assertRaisesRegex(ValueError, "size"):
            checker.read_latex_project(huge)

    def test_latex_diagnostics_omit_document_excerpts(self):
        checker = load_helper("nature-response", "check_package_consistency.py")
        private_text = "This sensitive supplied passage should never appear inside the diagnostic output message."
        findings = checker.check_quotes("Different manuscript", r"\RevisedExcerpt{" + private_text + "}", "response.tex", checker.DEFAULT_QUOTE_MACROS, 40)
        self.assertEqual(findings[0].code, "QUOTE_NOT_IN_MANUSCRIPT")
        self.assertNotIn(private_text, findings[0].message)

    def test_openrouter_does_not_search_parent_environment_files(self):
        generator = load_helper("literature-review", "generate_schematic_ai.py")
        (self.directory / ".env").write_text("OPENROUTER_API_KEY=forbidden-parent-fixture", encoding="utf-8")
        with patch("pathlib.Path.cwd", return_value=self.manuscript):
            with self.assertRaises(research_policy.AuthorizationError):
                generator._resolve_api_key()
        with self.assertRaisesRegex(ValueError, "Direct credential"):
            generator._resolve_api_key("unsafe-command-line-value")

    def test_openrouter_explicit_credential_file_and_request_configuration(self):
        generator = load_helper("literature-review", "generate_schematic_ai.py")
        credential_path = self.directory / "provider.env"
        credential_path.write_text("OPENROUTER_API_KEY=local-test-value", encoding="utf-8")
        self.policy["credentials"] = {"allowedEnvironmentVariables": ["OPENROUTER_API_KEY"], "files": [str(credential_path)]}
        self.save_policy()
        client = generator.ScientificSchematicGenerator(env_path=credential_path, image_model="fixture/image", review_model="fixture/review", estimated_request_cost=0.25)
        class Response:
            status_code = 200
            def json(self): return {"data": []}
        with patch.object(generator, "authorized_request", return_value=Response()) as request:
            client._post_request("images", {"model": "fixture/image", "prompt": "authorized fixture"})
        self.assertEqual(request.call_args.args, ("POST", "https://openrouter.ai/api/v1/images"))
        self.assertEqual(request.call_args.kwargs["estimated_cost"], 0.25)
        self.assertEqual(request.call_args.kwargs["json"]["model"], "fixture/image")

    def test_generation_does_not_pay_when_output_would_overwrite(self):
        generator = load_helper("literature-review", "generate_schematic_ai.py")
        client = object.__new__(generator.ScientificSchematicGenerator)
        output = self.write("existing.png", "preserved")
        with patch.object(client, "generate_image") as generate:
            with self.assertRaises(research_policy.AuthorizationError):
                client.generate_iterative("fixture", output, iterations=1)
        generate.assert_not_called()
        self.assertEqual(output.read_text(), "preserved")

    def test_generation_keeps_image_when_quality_review_is_unavailable(self):
        generator = load_helper("literature-review", "generate_schematic_ai.py")
        client = object.__new__(generator.ScientificSchematicGenerator)
        client.image_model, client.review_model = "fixture/image", "fixture/review"
        output = self.manuscript / "figure.png"
        image = b"\x89PNG\r\n\x1a\nfixture"
        review = generator.ReviewResult("", None, False, False, "fixture unavailable")
        with patch.object(client, "generate_image", return_value=image), patch.object(client, "review_image", return_value=review), contextlib.redirect_stdout(io.StringIO()):
            result = client.generate_iterative("private prompt fixture", output, iterations=1)
        self.assertTrue(result["success"])
        self.assertFalse(result["final_reviewed"])
        self.assertEqual(output.read_bytes(), image)
        report = (self.manuscript / "figure_review_log.json").read_text()
        self.assertNotIn("private prompt fixture", report)

    def test_arbitrary_citation_url_requires_network_authorization(self):
        metadata = load_helper("citation-management", "extract_metadata.py")
        client = metadata.MetadataExtractor()
        with patch("socket.getaddrinfo") as dns:
            with self.assertRaises(research_policy.AuthorizationError):
                client.extract_from_url("http://127.0.0.1/private")
        dns.assert_not_called()

    def test_public_metadata_client_does_not_require_credentials(self):
        pubmed = load_helper("citation-management", "search_pubmed.py")
        client = pubmed.PubMedSearcher()
        self.assertEqual(client.api_key, "")
        self.assertEqual(client.email, "")
        with self.assertRaises(ValueError):
            pubmed.PubMedSearcher(api_key="unapproved-direct-secret")

    def test_scholar_parses_local_fixture_and_does_not_bypass_challenges(self):
        scholar = load_helper("citation-management", "search_google_scholar.py")
        client = scholar.GoogleScholarSearcher()
        class Response:
            status_code = 200
            text = '<div class="gs_ri"><h3 class="gs_rt"><a href="https://example.org/paper">Evidence and uncertainty</a></h3><div class="gs_a">A Researcher - Example Journal, 2025</div><div class="gs_rs">Study summary</div><a>Cited by 12</a></div>'
        with patch.object(client.session, "get", return_value=Response()) as request:
            results = client.search("authorized topic", max_results=1)
        self.assertEqual(results[0]["title"], "Evidence and uncertainty")
        self.assertEqual(results[0]["year"], "2025")
        self.assertEqual(results[0]["citations"], 12)
        self.assertEqual(request.call_args.args[0], "https://scholar.google.com/scholar")
        Response.text = "Please complete the CAPTCHA"
        with patch.object(client.session, "get", return_value=Response()):
            with self.assertRaisesRegex(RuntimeError, "access challenge"):
                client.search("authorized topic", max_results=1)
        with self.assertRaises(ValueError):
            scholar.GoogleScholarSearcher(use_proxy=True)

    def test_bibtex_local_formatting_preserves_nested_capitalization_and_blocks_overwrite(self):
        common = load_helper("citation-management", "_common.py")
        source = self.write("references.bib", "@article{example, title={Testing {DNA} Models}, year={2025}}")
        parsed = common.parse_bibtex_file(str(source))
        self.assertEqual(parsed[0]["fields"]["title"], "Testing {DNA} Models")
        with self.assertRaises(research_policy.AuthorizationError):
            with common.open(source, "w") as output:
                output.write("destroyed")
        self.assertIn("{DNA}", source.read_text())

    def test_figure_export_creates_real_png_and_preserves_existing_output(self):
        figures = load_helper("scientific-visualization", "figure_export.py")
        import matplotlib.pyplot as plt
        figure, axes = plt.subplots()
        self.addCleanup(plt.close, figure)
        axes.plot([0, 1], [0, 1])
        figures.export_figure(figure, self.manuscript / "plot", formats=("png",))
        output = self.manuscript / "plot.png"
        self.assertTrue(output.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"))
        original = output.read_bytes()
        with self.assertRaises(research_policy.AuthorizationError):
            figures.export_figure(figure, self.manuscript / "plot", formats=("png",), overwrite=True)
        self.assertEqual(output.read_bytes(), original)

    def test_experimental_design_retains_real_factor_units(self):
        design = load_helper("experimental-design", "doe_designs.py")
        frame = design.full_factorial({"temperature": [20, 60], "concentration": [1, 10]}, randomize=False)
        self.assertEqual(len(frame), 4)
        self.assertEqual(set(frame["temperature"]), {20, 60})
        self.assertEqual(set(frame["concentration"]), {1, 10})

    def test_block_randomization_is_reproducible_and_balances_complete_blocks(self):
        randomization = load_helper("experimental-design", "randomization.py")
        first = randomization.block_randomization(12, arms=("A", "B"), block_size=4, seed=17)
        second = randomization.block_randomization(12, arms=("A", "B"), block_size=4, seed=17)
        self.assertTrue(first.equals(second))
        for start in (0, 4, 8):
            self.assertEqual(first.iloc[start:start + 4]["arm"].value_counts().to_dict(), {"A": 2, "B": 2})

    def test_assumption_helpers_report_missing_rows_and_flag_without_excluding(self):
        statistics = load_helper("statistical-analysis", "assumption_checks.py")
        values = [1, 2, 3, 4, 5, 100, float("nan")]
        result = statistics.detect_outliers(values, plot=False)
        self.assertEqual(result["n"], 6)
        self.assertEqual(result["n_missing"], 1)
        self.assertEqual(result["outlier_indices"].tolist(), [5])
        self.assertEqual(result["outlier_values"].tolist(), [100])
        self.assertEqual(len(values), 7)
        with self.assertRaises(ValueError):
            statistics.check_normality([2, 2, 2, 2], plot=False)

    def test_bibtex_malformed_records_are_explicitly_reported(self):
        common = load_helper("citation-management", "_common.py")
        with self.assertWarnsRegex(RuntimeWarning, "malformed fragment"):
            entries = common.parse_bibtex("@article{valid, title={Known}}\n@article{unfinished, title={Missing close}")
        self.assertEqual([entry["key"] for entry in entries], ["valid"])


if __name__ == "__main__":
    unittest.main()
