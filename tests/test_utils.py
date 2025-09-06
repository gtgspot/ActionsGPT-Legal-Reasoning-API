import unittest

try:
    import bs4  # type: ignore
    HAS_BS4 = True
except Exception:
    HAS_BS4 = False

from api.utils import now_iso, domain_allowed, html_to_text, digest_text, guess_citations


class UtilsTests(unittest.TestCase):
    def test_now_iso_format(self):
        ts = now_iso()
        self.assertTrue(ts.endswith("Z"))
        self.assertIn("T", ts)
        self.assertGreaterEqual(len(ts), 20)

    def test_domain_allowed(self):
        self.assertTrue(domain_allowed("https://www8.austlii.edu.au/au/cases/"))
        self.assertFalse(domain_allowed("https://example.com/foo"))

    @unittest.skipUnless(HAS_BS4, "requires beautifulsoup4")
    def test_html_to_text_strips_noise(self):
        html = """
        <html>
          <head><style>.x{display:none}</style></head>
          <body>
            <header>Header should go</header>
            <nav>Nav should go</nav>
            <div>Hello <b>World</b></div>
            <script>console.log('nope')</script>
            <footer>Footer should go</footer>
          </body>
        </html>
        """
        text = html_to_text(html)
        self.assertIn("Hello\nWorld", text)
        self.assertNotIn("Header should go", text)
        self.assertNotIn("console.log", text)

    def test_digest_text_deterministic(self):
        parts = ["alpha", "beta"]
        d1 = digest_text(parts)
        d2 = digest_text(parts)
        self.assertTrue(d1.startswith("sha256-"))
        self.assertEqual(d1, d2)

    def test_guess_citations_picks_evidence_act(self):
        text = "Under the Evidence Act 2008 (Vic) s 138, the court may exclude improperly obtained evidence."
        refs = guess_citations(text)
        self.assertTrue(any(r.title == "Evidence Act 2008 (Vic)" for r in refs))
        ev = next(r for r in refs if r.title == "Evidence Act 2008 (Vic)")
        self.assertIsNotNone(ev.pinpoint)
        self.assertTrue(ev.pinpoint.lower().startswith("s 138"))


if __name__ == "__main__":
    unittest.main()
