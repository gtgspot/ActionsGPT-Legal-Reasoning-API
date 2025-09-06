import unittest

from api.utils import guess_citations


class CitationDetectionTests(unittest.TestCase):
    def test_abbreviation_detects_statute(self):
        text = "Alleged breach under RSA 1986, s 49(1)(b)."
        refs = guess_citations(text)
        assert any("road-safety-act-1986" in r.source_id for r in refs)
        assert any((r.pinpoint or "").lower().startswith("s 49") for r in refs)

    def test_neutral_citation_detects_judgment(self):
        text = "See the High Court case [2004] HCA 16 for guidance."
        refs = guess_citations(text)
        jdgs = [r for r in refs if r.type == "judgment" and "2004" in r.title and "HCA" in r.title]
        assert jdgs
        # Ensure URL mapping to AustLII path
        assert any(r.uri and "/cth/HCA/2004/16.html" in r.uri for r in jdgs)


if __name__ == "__main__":
    unittest.main()
