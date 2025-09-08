from api.schemas import CaseMeta
from api.services.precedent import compute_precedential_weight, is_binding_on_vic


def test_is_binding_on_vic_rules():
    assert is_binding_on_vic("HCA")
    assert is_binding_on_vic("VSCA")
    assert not is_binding_on_vic("VSC")


def test_weight_prefers_hca_over_vsca_over_vsc():
    now = 2025
    hca = CaseMeta(court_level="HCA", year=2020, ratio_excerpt="para")
    vsca = CaseMeta(court_level="VSCA", year=2022, ratio_excerpt="para")
    vsc = CaseMeta(court_level="VSC", year=2024)
    wh = compute_precedential_weight(hca, now)
    wvsca = compute_precedential_weight(vsca, now)
    wvsc = compute_precedential_weight(vsc, now)
    assert wh > wvsca > wvsc


def test_weight_penalizes_overruled_and_rewards_followed():
    now = 2025
    base = CaseMeta(court_level="VSC", year=2020)
    followed = CaseMeta(court_level="VSC", year=2020, subsequent_treatments=[{"treatment": "followed", "count": 3}])
    overruled = CaseMeta(court_level="VSCA", year=2020, disposition="Overruled")
    wb = compute_precedential_weight(base, now)
    wf = compute_precedential_weight(followed, now)
    wo = compute_precedential_weight(overruled, now)
    assert wf > wb
    assert wo < wb

