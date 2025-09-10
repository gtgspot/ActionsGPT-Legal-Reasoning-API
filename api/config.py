import json
import os
from pathlib import Path
from typing import Dict

# ---------- Configuration ----------
ALLOWED_DOMAINS = {
    "legislation.vic.gov.au",
    "www.legislation.vic.gov.au",
    "www8.austlii.edu.au",
    "judicialcollege.vic.edu.au",
    "mcv.vic.gov.au",
    "legislation.gov.au",
    "www.legislation.gov.au",
    # Other Australian jurisdictions — in-force legislation portals
    "www.legislation.nsw.gov.au",
    "legislation.nsw.gov.au",
    "www.legislation.qld.gov.au",
    "legislation.qld.gov.au",
    "www.legislation.wa.gov.au",
    "www.legislation.sa.gov.au",
    "www.legislation.tas.gov.au",
    "www.legislation.act.gov.au",
    "legislation.nt.gov.au",
    "legis.com.au",
    "www.legis.com.au",
    "b2find.eudat.eu",
    "researchdata.edu.au",
    "huggingface.co",
    "github.com",
    # Language/package registries (added)
    "pypi.org",
    "pypa.io",
    "npmjs.com",
    "npmjs.org",
    "registry.npmjs.org",
    "yarnpkg.com",
    "maven.org",
    "search.maven.org",
    "gradle.org",
    "jcenter.bintray.com",
    "goproxy.io",
    "proxy.golang.org",
    "pkg.go.dev",
    "golang.org",
    "crates.io",
    "rubygems.org",
    "packagist.org",
    "repo.packagist.org",
    "nuget.org",
    "api.nuget.org",
    "dotnet.microsoft.com",
    "microsoft.com",
}
# Extend allowlist from environment (comma-separated)
extra_domains = os.environ.get("ALLOWED_DOMAINS_CSV")
if extra_domains:
    for d in [s.strip() for s in extra_domains.split(",") if s.strip()]:
        ALLOWED_DOMAINS.add(d)
USER_AGENT = "ActionsGPT-Legal/1.0 (+https://example.org)"

# Max characters to keep from fetched/parsed content
MAX_TEXT_CHARS = 200_000

# Document store bounds
DOCS_MAX_ITEMS = 1000
DOCS_TTL_SECONDS = 24 * 60 * 60  # 24 hours
DOCS_MAX_CHUNKS_PER_DOC = 100
DOCS_MAX_BYTES_PER_DOC = 2_000_000

# Precedent ranking weights (tunable)
PRECEDENT_WEIGHTS = {
    "w_binding": 0.35,
    "w_court": 0.25,
    "w_ratio": 0.10,
    "w_unanimity": 0.05,
    "w_treatment": 0.15,
    "w_jurisdiction": 0.05,
    "w_age": 0.05,
    "contrary_penalty": 0.50,
    "age_lambda": 0.05,  # exp(-lambda * years)
    "treatment_cap": 0.20,  # abs cap for treatment delta
}

# Provider throttling defaults (can be overridden per provider in providers.yml)
THROTTLE_DEFAULT = {
    "min_delay_ms": 0,
    "max_inflight": 4,
}

CANON_DEFAULT: Dict[str, str] = {
    "Road Safety Act 1986 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/road-safety-act-1986",
    "Evidence Act 2008 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/evidence-act-2008",
    "Magistrates’ Court Criminal Procedure Rules 2019 (Vic)": "https://www.legislation.vic.gov.au/in-force/statutory-rules/magistrates-court-criminal-procedure-rules-2019",
    "Road Safety (General) Regulations 2019 (Vic)": "https://www.legislation.vic.gov.au/in-force/statutory-rules/road-safety-general-regulations-2019",
    "Magistrates’ Court Act 1989 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/magistrates-court-act-1989",
    "Sentencing Act 1991 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/sentencing-act-1991",
    "Charter of Human Rights and Responsibilities Act 2006 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/charter-human-rights-and-responsibilities-act-2006",
    "Infringements Act 2006 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/infringements-act-2006",
    "Interpretation of Legislation Act 1984 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/interpretation-legislation-act-1984",
    "Public Administration Act 2004 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/public-administration-act-2004",
    "Victoria Police Act 2013 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/victoria-police-act-2013",
    "Freedom of Information Act 1982 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/freedom-information-act-1982",
    "Drugs, Poisons and Controlled Substances Act 1981 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/drugs-poisons-and-controlled-substances-act-1981",
    "Privacy and Data Protection Act 2014 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/privacy-and-data-protection-act-2014",
    "Surveillance Devices Act 1999 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/surveillance-devices-act-1999",
    "Subordinate Legislation Act 1994 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/subordinate-legislation-act-1994",
    "Occupational Health and Safety Act 2004 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/occupational-health-and-safety-act-2004",
    "Equal Opportunity Act 2010 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/equal-opportunity-act-2010",
    "Australian Constitution": "https://www.legislation.gov.au/constitution",
    "Judicial College of Victoria — Criminal Charge Book": "https://judicialcollege.vic.edu.au/eManuals/CCB/64177.htm",
    "MCV Prescribed Forms": "https://www.mcv.vic.gov.au/form-finder",
    # Frequently cited but not in the earlier list
    "Criminal Procedure Act 2009 (Vic)": "https://www.legislation.vic.gov.au/in-force/acts/criminal-procedure-act-2009",
}

# Load external canon (if present), merge over defaults
def _load_canon() -> Dict[str, str]:
    data_path = Path(__file__).resolve().parents[1] / "data" / "canon.json"
    canon = dict(CANON_DEFAULT)
    try:
        if data_path.exists():
            with data_path.open("r", encoding="utf-8") as f:
                ext = json.load(f)
                if isinstance(ext, dict):
                    canon.update({str(k): str(v) for k, v in ext.items()})
    except Exception:
        # Fall back silently if file malformed
        pass
    return canon

CANON: Dict[str, str] = _load_canon()


def reload_canon() -> int:
    """Reload the CANON mapping from disk, returning number of entries."""
    global CANON
    CANON = _load_canon()
    return len(CANON)
