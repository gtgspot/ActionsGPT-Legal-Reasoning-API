from api.services.sources import select_providers


def test_select_providers_vic_order():
    order = select_providers("VIC")
    assert order[:3] == ["legislation-vic", "austlii-vic-cases", "austlii-hca"]


def test_select_providers_cth_order():
    order = select_providers("CTH")
    assert order[:2] == ["legislation-cth", "austlii-hca"]


def test_select_providers_other_order():
    order = select_providers("OTHER")
    assert order and order[0] in {"austlii-hca", "legislation-vic"}

