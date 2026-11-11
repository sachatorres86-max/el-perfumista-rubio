from __future__ import annotations

import io
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

PAGE_SIZE = landscape(A4)
MARGIN_X = 10 * mm
MARGIN_TOP = 22 * mm
MARGIN_BOTTOM = 16 * mm

INK = colors.HexColor("#2f261c")
BRAND = colors.HexColor("#8a5a2b")
MUTED = colors.HexColor("#6f655b")
LINE = colors.HexColor("#ddd3c7")
ROW_ALT = colors.HexColor("#faf7f2")

NUMERIC_LABELS = (
    "ID",
    "Unidades",
    "Total",
    "Cantidad",
    "Stock",
    "Costo",
    "Precio",
    "Subtotal",
    "Valor",
)


def _is_numeric(label: str) -> bool:
    return any(token in label for token in NUMERIC_LABELS)


def _format_date(value: datetime) -> str:
    return value.strftime("%d/%m/%Y %H:%M")


def _draw_page_frame(canvas, doc) -> None:
    width, height = PAGE_SIZE
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN_X, height - 16 * mm, width - MARGIN_X, height - 16 * mm)

    canvas.setFillColor(BRAND)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN_X, height - 12 * mm, "EL PERFUMISTA RUBIO")

    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(width - MARGIN_X, height - 12 * mm, "Reporte administrativo")

    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(MARGIN_X, 9 * mm, "Documento generado desde el panel administrativo")
    canvas.drawRightString(width - MARGIN_X, 9 * mm, f"Página {doc.page}")
    canvas.restoreState()


def build_report_pdf(
    *,
    title: str,
    period_label: str,
    period_start: datetime,
    period_end: datetime,
    headers: list[str],
    rows: list[list[object]],
    col_ratios: list[float] | None = None,
) -> bytes:
    """Genera un PDF tabular con encabezado, período y numeración de páginas."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=PAGE_SIZE,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title=title,
        author="El Perfumista Rubio",
        subject=f"{period_label}: {_format_date(period_start)} - {_format_date(period_end)}",
    )

    title_style = ParagraphStyle(
        "ReportTitle",
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=20,
        textColor=INK,
        spaceAfter=3,
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=MUTED,
    )
    empty_style = ParagraphStyle(
        "ReportEmpty",
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=11,
        textColor=MUTED,
        spaceBefore=6,
    )
    cell_font_size = 6.3 if len(headers) >= 12 else 7.1 if len(headers) >= 10 else 7.7
    cell_style = ParagraphStyle(
        "ReportCell",
        fontName="Helvetica",
        fontSize=cell_font_size,
        leading=cell_font_size + 1.8,
        textColor=INK,
        alignment=TA_LEFT,
    )
    numeric_style = ParagraphStyle(
        "ReportCellNumeric",
        parent=cell_style,
        alignment=TA_RIGHT,
    )
    header_style = ParagraphStyle(
        "ReportHeader",
        fontName="Helvetica-Bold",
        fontSize=max(5.8, cell_font_size - 0.4),
        leading=max(7.2, cell_font_size + 0.8),
        textColor=colors.white,
        alignment=TA_LEFT,
    )

    story = [
        Paragraph(escape(title), title_style),
        Paragraph(
            (
                f"{escape(period_label)} · {_format_date(period_start)} al "
                f"{_format_date(period_end)} · {len(rows)} "
                f"{'registro' if len(rows) == 1 else 'registros'}"
            ),
            subtitle_style,
        ),
        Paragraph(
            f"Generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M')}",
            subtitle_style,
        ),
        Spacer(1, 8),
    ]

    table_data: list[list[Paragraph]] = [
        [Paragraph(escape(label), header_style) for label in headers]
    ]
    numeric_columns = [_is_numeric(label) for label in headers]
    for row in rows:
        table_data.append(
            [
                Paragraph(
                    escape("" if value is None else str(value)),
                    numeric_style if numeric_columns[index] else cell_style,
                )
                for index, value in enumerate(row)
            ]
        )

    if col_ratios is None or len(col_ratios) != len(headers):
        col_ratios = [1.0] * len(headers)
    total_ratio = sum(col_ratios)
    col_widths = [doc.width * ratio / total_ratio for ratio in col_ratios]

    table = Table(table_data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), INK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.3, LINE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(table)

    if not rows:
        story.append(Paragraph("No se encontraron registros para este período.", empty_style))

    doc.build(story, onFirstPage=_draw_page_frame, onLaterPages=_draw_page_frame)
    return buffer.getvalue()
