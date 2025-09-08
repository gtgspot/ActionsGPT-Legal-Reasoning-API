from api.services.precedent import build_authority_line


def test_authority_line_includes_counter_for_negative_treatments():
    precedents = [
        {
            "title": "[2020] VSCA 10",
            "meta": {
                "neutral_citation": "[2020] VSCA 10",
                "court_level": "VSCA",
                "binding_on_vic": True,
                "precedential_weight": 0.9,
                "subsequent_treatments": [{"treatment": "distinguished", "count": 2}],
            },
        },
        {
            "title": "[2015] VSC 100",
            "meta": {
                "neutral_citation": "[2015] VSC 100",
                "court_level": "VSC",
                "binding_on_vic": False,
                "precedential_weight": 0.5,
            },
        },
    ]
    line = build_authority_line(precedents)
    assert line["counter"], "Expected counter list to be non-empty"
    assert any("VSCA" in (c.get("neutral_citation") or "") for c in line["counter"])

