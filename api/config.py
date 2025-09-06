from typing import Dict
import json
from pathlib import Path

# ---------- Configuration ----------
ALLOWED_DOMAINS = {
    "legislation.vic.gov.au",
    "www.legislation.vic.gov.au",
    "www8.austlii.edu.au",
    "judicialcollege.vic.edu.au",
    "mcv.vic.gov.au",
    "legislation.gov.au",
    "www.legislation.gov.au",
    "legis.com.au",
    "www.legis.com.au",
    "b2find.eudat.eu",
    "researchdata.edu.au",
    "huggingface.co",
    "github.com",
}
USER_AGENT = "ActionsGPT-Legal/1.0 (+https://example.org)"

# Max characters to keep from fetched/parsed content
MAX_TEXT_CHARS = 200_000

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
