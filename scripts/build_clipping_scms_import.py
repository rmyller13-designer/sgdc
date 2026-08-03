from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlparse

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE_XLSX = Path(r"C:\Users\ti\Downloads\Clipping SCMS.xlsx")
OUTPUT_JSON = ROOT / "data" / "clipping-scms-import.json"

MESES = {
    "JANEIRO": 1,
    "FEVEREIRO": 2,
    "MARÇO": 3,
    "MARCO": 3,
    "ABRIL": 4,
    "MAIO": 5,
    "JUNHO": 6,
    "JULHO": 7,
    "AGOSTO": 8,
    "SETEMBRO": 9,
    "OUTUBRO": 10,
    "NOVEMBRO": 11,
    "DEZEMBRO": 12,
}


@dataclass
class RegistroImportacao:
    chave: str
    ano_origem: int
    mes_referencia: int
    data_publicacao: str
    data_precisao: str
    canal: str
    sentimento: str
    status: str
    autoria: str
    titulo: str
    url: str | None
    observacoes: str | None
    views: int = 0
    comentarios: int = 0
    likes: int = 0
    compartilhamentos: int = 0
    salvos: int = 0
    engajamento: int = 0

    def to_dict(self) -> dict:
        return {
            "chave": self.chave,
            "ano_origem": self.ano_origem,
            "mes_referencia": self.mes_referencia,
            "data_publicacao": self.data_publicacao,
            "data_precisao": self.data_precisao,
            "canal": self.canal,
            "sentimento": self.sentimento,
            "status": self.status,
            "autoria": self.autoria,
            "titulo": self.titulo,
            "url": self.url,
            "observacoes": self.observacoes,
            "views": self.views,
            "comentarios": self.comentarios,
            "likes": self.likes,
            "compartilhamentos": self.compartilhamentos,
            "salvos": self.salvos,
            "engajamento": self.engajamento,
        }


def main():
    if not SOURCE_XLSX.exists():
        raise SystemExit(f"Arquivo não encontrado: {SOURCE_XLSX}")

    registros: list[RegistroImportacao] = []
    resumo_anos: dict[str, dict] = {}
    excel = pd.ExcelFile(SOURCE_XLSX)

    for sheet in ["2019", "2020", "2021", "2022", "2023", "2025", "2026"]:
        itens = parse_sheet(excel, sheet)
        registros.extend(itens)
        resumo_anos[sheet] = summarize_sheet(itens)

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source_file": str(SOURCE_XLSX),
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "registros": [item.to_dict() for item in registros],
        "meta": {
            "total_registros": len(registros),
            "por_ano": resumo_anos,
            "resumo_2024": extract_2024_summary(excel),
            "sentimentos": dict(Counter(item.sentimento for item in registros)),
            "canais": dict(Counter(item.canal for item in registros)),
        },
    }

    OUTPUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Gerado: {OUTPUT_JSON}")
    print(json.dumps(payload["meta"], ensure_ascii=False, indent=2))


def parse_sheet(excel: pd.ExcelFile, sheet: str) -> list[RegistroImportacao]:
    df = pd.read_excel(excel, sheet_name=sheet, header=None).fillna("")
    ano = int(sheet)
    current_month: Optional[int] = None
    current_exact_date: Optional[date] = None
    registros: list[RegistroImportacao] = []

    for _, row in df.iterrows():
        vals = [normalize_space(str(v)) for v in row.tolist()]
        if not any(vals):
            continue

        first = vals[0]
        first_upper = remove_accents(first).upper()

        if first_upper in MESES:
            current_month = MESES[first_upper]
            current_exact_date = None
            continue

        if sheet in {"2019", "2020", "2021"}:
            parsed_date = parse_explicit_date(
                first,
                sheet_year=ano,
                reference_month=current_month,
            )
            if parsed_date:
                current_exact_date = parsed_date
                current_month = current_month or parsed_date.month
                continue

            if is_section_header(vals) or is_total_row(vals):
                continue

            veiculo, titulo, link = vals[0], vals[1] if len(vals) > 1 else "", vals[2] if len(vals) > 2 else ""
            if not veiculo or not titulo:
                continue

            data_publicacao, precisao = resolve_date(
                explicit_date=current_exact_date,
                month=current_month,
                year=ano,
                link=link or None,
            )
            registros.append(
                build_record(
                    ano=ano,
                    month=current_month,
                    data_publicacao=data_publicacao,
                    data_precisao=precisao,
                    veiculo=veiculo,
                    titulo=titulo,
                    link=link or None,
                    sentimento_raw=None,
                    retranca=None,
                    notes=[f"Importado do acervo SCMS ({sheet})."],
                )
            )
            continue

        if sheet in {"2022", "2023"}:
            if is_section_header(vals) or is_total_row(vals):
                continue

            veiculo = vals[0]
            link = vals[1] if len(vals) > 1 else ""
            if not veiculo or not link:
                continue

            titulo, titulo_derivado = title_from_url(link, veiculo, current_month, ano)
            data_publicacao, precisao = resolve_date(
                explicit_date=None,
                month=current_month,
                year=ano,
                link=link,
            )
            notes = [f"Importado do acervo SCMS ({sheet})."]
            if titulo_derivado:
                notes.append("Título derivado automaticamente do link.")
            if precisao != "EXATA":
                notes.append("Data inferida com base no mês de referência ou na URL.")

            registros.append(
                build_record(
                    ano=ano,
                    month=current_month,
                    data_publicacao=data_publicacao,
                    data_precisao=precisao,
                    veiculo=veiculo,
                    titulo=titulo,
                    link=link,
                    sentimento_raw=None,
                    retranca=None,
                    notes=notes,
                )
            )
            continue

        if sheet == "2025":
            if first_upper in MESES:
                current_month = MESES[first_upper]
                current_exact_date = None
                continue

            if first == "Data":
                continue

            veiculo = vals[1] if len(vals) > 1 else ""
            titulo = vals[2] if len(vals) > 2 else ""
            link = vals[3] if len(vals) > 3 else ""
            sentimento_raw = vals[4] if len(vals) > 4 else ""
            raw_date = vals[0]

            if not veiculo or not titulo or not link:
                continue

            data_publicacao, precisao = resolve_date(
                explicit_date=parse_explicit_date(
                    raw_date,
                    sheet_year=ano,
                    reference_month=current_month,
                ),
                month=current_month,
                year=ano,
                link=link,
            )
            notes = [f"Importado do acervo SCMS ({sheet})."]
            if precisao != "EXATA":
                notes.append("Data inferida com base no mês de referência ou na URL.")

            registros.append(
                build_record(
                    ano=ano,
                    month=current_month,
                    data_publicacao=data_publicacao,
                    data_precisao=precisao,
                    veiculo=veiculo,
                    titulo=titulo,
                    link=link,
                    sentimento_raw=sentimento_raw,
                    retranca=None,
                    notes=notes,
                )
            )
            continue

        if sheet == "2026":
            if first == "Data":
                continue

            raw_date = vals[0]
            sentimento_raw = vals[1] if len(vals) > 1 else ""
            retranca = vals[2] if len(vals) > 2 else ""
            veiculo = vals[3] if len(vals) > 3 else ""
            titulo = vals[4] if len(vals) > 4 else ""
            link = vals[5] if len(vals) > 5 else ""

            if not veiculo or not titulo or not link:
                continue

            data_publicacao, precisao = resolve_date(
                explicit_date=parse_explicit_date(
                    raw_date,
                    sheet_year=ano,
                    reference_month=current_month,
                ),
                month=current_month,
                year=ano,
                link=link,
            )
            notes = [f"Importado do acervo SCMS ({sheet})."]
            if precisao != "EXATA":
                notes.append("Data inferida com base no mês de referência ou na URL.")

            registros.append(
                build_record(
                    ano=ano,
                    month=current_month,
                    data_publicacao=data_publicacao,
                    data_precisao=precisao,
                    veiculo=veiculo,
                    titulo=titulo,
                    link=link,
                    sentimento_raw=sentimento_raw,
                    retranca=retranca,
                    notes=notes,
                )
            )

    return dedupe_records(registros)


def build_record(
    *,
    ano: int,
    month: Optional[int],
    data_publicacao: str,
    data_precisao: str,
    veiculo: str,
    titulo: str,
    link: Optional[str],
    sentimento_raw: Optional[str],
    retranca: Optional[str],
    notes: list[str],
) -> RegistroImportacao:
    sentimento = map_sentimento(sentimento_raw)
    canal = infer_channel(link)
    title = normalize_space(titulo)
    autoria = normalize_space(veiculo)

    observacoes = list(notes)
    if retranca:
        observacoes.insert(0, f"Retranca: {normalize_space(retranca)}")

    return RegistroImportacao(
        chave=build_key(ano, autoria, title, link, data_publicacao),
        ano_origem=ano,
        mes_referencia=month or 1,
        data_publicacao=data_publicacao,
        data_precisao=data_precisao,
        canal=canal,
        sentimento=sentimento,
        status="FECHADO",
        autoria=autoria,
        titulo=title,
        url=link or None,
        observacoes=" ".join(item for item in observacoes if item),
    )


def summarize_sheet(registros: list[RegistroImportacao]) -> dict:
    return {
        "total": len(registros),
        "canais": dict(Counter(item.canal for item in registros)),
        "sentimentos": dict(Counter(item.sentimento for item in registros)),
        "com_data_exata": sum(1 for item in registros if item.data_precisao == "EXATA"),
        "com_data_inferida": sum(1 for item in registros if item.data_precisao != "EXATA"),
    }


def extract_2024_summary(excel: pd.ExcelFile) -> dict:
    df = pd.read_excel(excel, sheet_name="2024", header=None).fillna("")
    current_month = None
    resumo = {}

    for _, row in df.iterrows():
        text = normalize_space(str(row.iloc[0]))
        if not text:
            continue
        upper = remove_accents(text).upper()
        if upper in MESES:
            current_month = upper
            continue
        if text.startswith("Total:") and current_month:
            match = re.search(
                r"Total:\s*(\d+)\s*\|\s*POS:\s*(\d+)\s*\|\s*NEG:\s*(\d+)\s*\|\s*NEUTRA:\s*(\d+)",
                text,
                flags=re.IGNORECASE,
            )
            if match:
                resumo[current_month] = {
                    "total": int(match.group(1)),
                    "positivas": int(match.group(2)),
                    "negativas": int(match.group(3)),
                    "neutras": int(match.group(4)),
                }
    return resumo


def dedupe_records(registros: list[RegistroImportacao]) -> list[RegistroImportacao]:
    seen = set()
    resultado = []
    for item in registros:
        if item.chave in seen:
            continue
        seen.add(item.chave)
        resultado.append(item)
    return resultado


def build_key(ano: int, autoria: str, titulo: str, link: Optional[str], data_publicacao: str) -> str:
    base = "|".join(
        [
            str(ano),
            slugify(autoria),
            slugify(titulo),
            slugify(link or ""),
            data_publicacao,
        ]
    )
    return base[:500]


def infer_channel(link: Optional[str]) -> str:
    if not link:
        return "SITE"
    lower = link.lower()
    if "instagram.com" in lower or "instagr.am" in lower:
        return "INSTAGRAM"
    if "facebook.com" in lower or "fb.watch" in lower:
        return "FACEBOOK"
    return "SITE"


def map_sentimento(raw: Optional[str]) -> str:
    text = remove_accents(normalize_space(raw or "")).upper()
    if not text:
        return "NAO_CLASSIFICADO"
    if "POSIT" in text:
        return "POSITIVA"
    if "NEGAT" in text:
        return "NEGATIVA"
    if "NEUTR" in text:
        return "NEUTRA"
    return "NAO_CLASSIFICADO"


def title_from_url(link: str, veiculo: str, month: Optional[int], year: int) -> tuple[str, bool]:
    parsed = urlparse(link)
    path_segments = [segment for segment in parsed.path.split("/") if segment]
    slug = path_segments[-1] if path_segments else parsed.netloc
    slug = slug.replace(".html", "").replace(".ghtml", "").replace(".php", "")
    slug = unquote(slug)
    slug = re.sub(r"[_-]+", " ", slug)
    slug = re.sub(r"\s+", " ", slug).strip(" /")
    slug = re.sub(r"^\d+\s*", "", slug)
    slug = normalize_space(slug)
    if slug and len(slug) > 8:
        return humanize_title(slug), True
    fallback = f"Matéria sem título informado - {normalize_space(veiculo)} - {month or 1:02d}/{year}"
    return fallback, True


def resolve_date(
    *,
    explicit_date: Optional[date],
    month: Optional[int],
    year: int,
    link: Optional[str],
) -> tuple[str, str]:
    inferred = infer_date_from_url(link or "")

    if explicit_date:
        if (
            inferred
            and inferred.year == year
            and explicit_date != inferred
            and explicit_date.month <= 12
            and explicit_date.day <= 12
        ):
            return inferred.isoformat(), "URL"
        return explicit_date.isoformat(), "EXATA"

    if inferred:
        return inferred.isoformat(), "URL"

    mes = month or 1
    return date(year, mes, 1).isoformat(), "MES_REFERENCIA"


def infer_date_from_url(link: str) -> Optional[date]:
    lower = link.lower()
    match = re.search(r"/(20\d{2})/(\d{2})/(\d{2})/", lower)
    if match:
        return safe_date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    match = re.search(r"/(20\d{2})/(\d{2})/", lower)
    if match:
        return safe_date(int(match.group(1)), int(match.group(2)), 1)
    return None


def parse_explicit_date(
    value: str,
    *,
    sheet_year: Optional[int] = None,
    reference_month: Optional[int] = None,
) -> Optional[date]:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            parsed = pd.to_datetime(value, format=fmt).date()
            return reconcile_explicit_date(parsed, sheet_year, reference_month)
        except Exception:
            pass
    try:
        parsed = pd.to_datetime(value).date()
        return reconcile_explicit_date(parsed, sheet_year, reference_month)
    except Exception:
        return None


def reconcile_explicit_date(
    parsed: date,
    sheet_year: Optional[int],
    reference_month: Optional[int],
) -> date:
    if sheet_year is None:
        return parsed

    if reference_month and parsed.day == reference_month and parsed.month != reference_month:
        corrigida = safe_date(sheet_year, reference_month, parsed.month)
        if corrigida:
            return corrigida

    if parsed.year == sheet_year:
        return parsed

    if parsed.year == sheet_year + 1 and reference_month:
        if parsed.month == reference_month:
            corrigida = safe_date(sheet_year, parsed.month, parsed.day)
            if corrigida:
                return corrigida

        if parsed.day == reference_month:
            corrigida = safe_date(sheet_year, reference_month, parsed.month)
            if corrigida:
                return corrigida

    corrigida = safe_date(sheet_year, parsed.month, parsed.day)
    if corrigida:
        return corrigida

    return parsed


def safe_date(year: int, month: int, day: int) -> Optional[date]:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def slugify(text: str) -> str:
    clean = remove_accents(text).lower()
    clean = re.sub(r"[^a-z0-9]+", "-", clean).strip("-")
    return clean


def humanize_title(text: str) -> str:
    text = normalize_space(text)
    if not text:
        return text
    lower_words = {
        "de",
        "da",
        "do",
        "das",
        "dos",
        "e",
        "em",
        "na",
        "no",
        "nas",
        "nos",
        "para",
        "por",
        "com",
        "ao",
        "aos",
    }
    parts = []
    for index, word in enumerate(text.split()):
        lowered = word.lower()
        if index > 0 and lowered in lower_words:
            parts.append(lowered)
        else:
            parts.append(lowered[:1].upper() + lowered[1:])
    return " ".join(parts)


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def remove_accents(text: str) -> str:
    return (
        text.replace("á", "a")
        .replace("à", "a")
        .replace("ã", "a")
        .replace("â", "a")
        .replace("ä", "a")
        .replace("Á", "A")
        .replace("À", "A")
        .replace("Ã", "A")
        .replace("Â", "A")
        .replace("Ä", "A")
        .replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .replace("ë", "e")
        .replace("É", "E")
        .replace("È", "E")
        .replace("Ê", "E")
        .replace("Ë", "E")
        .replace("í", "i")
        .replace("ì", "i")
        .replace("î", "i")
        .replace("ï", "i")
        .replace("Í", "I")
        .replace("Ì", "I")
        .replace("Î", "I")
        .replace("Ï", "I")
        .replace("ó", "o")
        .replace("ò", "o")
        .replace("õ", "o")
        .replace("ô", "o")
        .replace("ö", "o")
        .replace("Ó", "O")
        .replace("Ò", "O")
        .replace("Õ", "O")
        .replace("Ô", "O")
        .replace("Ö", "O")
        .replace("ú", "u")
        .replace("ù", "u")
        .replace("û", "u")
        .replace("ü", "u")
        .replace("Ú", "U")
        .replace("Ù", "U")
        .replace("Û", "U")
        .replace("Ü", "U")
        .replace("ç", "c")
        .replace("Ç", "C")
    )


def is_section_header(vals: list[str]) -> bool:
    if not vals:
        return False
    return vals[0] == "Blogs/Sites" or vals[0] == "Data"


def is_total_row(vals: list[str]) -> bool:
    return any(v.upper().startswith("TOTAL") for v in vals if v)


if __name__ == "__main__":
    main()
