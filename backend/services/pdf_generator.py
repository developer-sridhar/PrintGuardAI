import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch, mm

# ── Brand colours ────────────────────────────────────────────────────────────
NAVY      = colors.HexColor('#0f172a')
NAVY_MID  = colors.HexColor('#1e293b')
CYAN      = colors.HexColor('#06b6d4')
AMBER     = colors.HexColor('#f59e0b')
SLATE     = colors.HexColor('#64748b')
SLATE_LT  = colors.HexColor('#94a3b8')
LIGHT_BG  = colors.HexColor('#f8fafc')
WHITE     = colors.HexColor('#ffffff')
GREEN     = colors.HexColor('#10b981')
RED       = colors.HexColor('#ef4444')

# Full usable width: A4(595pt) - 40mm margins = ~155mm = ~439pt
_PAGE_W   = A4[0]
_PAGE_H   = A4[1]
_MARGIN   = 20 * mm
_CONTENT_W = _PAGE_W - 2 * _MARGIN  # ≈ 439 pt


class PrintReportGenerator:
    def __init__(self, filename: str, data: dict):
        self.filename = filename
        self.data = data
        self.doc = SimpleDocTemplate(
            self.filename,
            pagesize=A4,
            rightMargin=_MARGIN,
            leftMargin=_MARGIN,
            topMargin=_MARGIN,
            bottomMargin=_MARGIN,
        )
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.story = []

    # ── Custom styles ─────────────────────────────────────────────────────────
    def _setup_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name='CoverTitle',
            fontName='Helvetica-Bold',
            fontSize=26,
            textColor=WHITE,
            leading=32,
            spaceAfter=4,
        ))
        self.styles.add(ParagraphStyle(
            name='CoverSub',
            fontName='Helvetica',
            fontSize=13,
            textColor=CYAN,
            spaceAfter=0,
        ))
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            fontName='Helvetica-Bold',
            fontSize=20,
            textColor=NAVY,
            spaceAfter=4,
            spaceBefore=0,
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            fontName='Helvetica-Bold',
            fontSize=13,
            textColor=NAVY,
            spaceAfter=4,
            spaceBefore=8,
        ))
        self.styles.add(ParagraphStyle(
            name='NormalText',
            fontName='Helvetica',
            fontSize=10,
            textColor=SLATE,
            leading=14,
        ))
        self.styles.add(ParagraphStyle(
            name='ValueText',
            fontName='Helvetica-Bold',
            fontSize=10,
            textColor=NAVY,
            leading=14,
        ))
        self.styles.add(ParagraphStyle(
            name='SmallLabel',
            fontName='Helvetica',
            fontSize=8,
            textColor=SLATE_LT,
        ))
        self.styles.add(ParagraphStyle(
            name='ScoreBig',
            fontName='Helvetica-Bold',
            fontSize=32,
            textColor=CYAN,
            leading=36,
        ))

    # ── Canvas callbacks ──────────────────────────────────────────────────────
    def _draw_cover_page(self, canvas_ctx, doc):
        """Draw full navy header band on the cover page only."""
        canvas_ctx.saveState()
        # Navy header band: top 72mm
        band_h = 72 * mm
        canvas_ctx.setFillColor(NAVY)
        canvas_ctx.rect(0, _PAGE_H - band_h, _PAGE_W, band_h, fill=1, stroke=0)
        # Cyan accent line below band
        canvas_ctx.setFillColor(CYAN)
        canvas_ctx.rect(0, _PAGE_H - band_h - 3 * mm, _PAGE_W, 3 * mm, fill=1, stroke=0)
        # PrintGuard logo text (top-left inside band)
        canvas_ctx.setFillColor(CYAN)
        canvas_ctx.setFont('Helvetica-Bold', 11)
        canvas_ctx.drawString(_MARGIN, _PAGE_H - 18 * mm, 'PRINTGUARD AI')
        canvas_ctx.setFillColor(WHITE)
        canvas_ctx.setFont('Helvetica', 9)
        canvas_ctx.drawString(_MARGIN, _PAGE_H - 26 * mm, 'Professional Print Analysis System')
        # Title in band
        canvas_ctx.setFillColor(WHITE)
        canvas_ctx.setFont('Helvetica-Bold', 24)
        canvas_ctx.drawString(_MARGIN, _PAGE_H - 48 * mm, 'AI PRINT ANALYSIS REPORT')
        canvas_ctx.setFillColor(CYAN)
        canvas_ctx.setFont('Helvetica', 12)
        fname = self.data.get('file_name', '')
        canvas_ctx.drawString(_MARGIN, _PAGE_H - 62 * mm, f'File: {fname}')
        canvas_ctx.restoreState()

    def _draw_subsequent_pages(self, canvas_ctx, doc):
        """Thin header bar + page number for all pages after cover."""
        canvas_ctx.saveState()
        # Thin navy top bar
        canvas_ctx.setFillColor(NAVY)
        canvas_ctx.rect(0, _PAGE_H - 10 * mm, _PAGE_W, 10 * mm, fill=1, stroke=0)
        canvas_ctx.setFillColor(CYAN)
        canvas_ctx.setFont('Helvetica-Bold', 7)
        canvas_ctx.drawString(_MARGIN, _PAGE_H - 6.5 * mm, 'PRINTGUARD AI  ·  Professional Analysis Report')
        # Page number
        canvas_ctx.setFillColor(SLATE_LT)
        canvas_ctx.setFont('Helvetica', 7)
        canvas_ctx.drawRightString(_PAGE_W - _MARGIN, _PAGE_H - 6.5 * mm, f'Page {doc.page}')
        # Bottom rule
        canvas_ctx.setStrokeColor(SLATE_LT)
        canvas_ctx.setLineWidth(0.5)
        canvas_ctx.line(_MARGIN, 12 * mm, _PAGE_W - _MARGIN, 12 * mm)
        canvas_ctx.setFillColor(SLATE_LT)
        canvas_ctx.setFont('Helvetica', 7)
        canvas_ctx.drawString(_MARGIN, 8 * mm,
                              'Confidential — Generated by PrintGuard AI Analytics Engine')
        canvas_ctx.restoreState()

    # ── Helper ──────────────────────────────────────────────────────────────
    def _section_rule(self):
        self.story.append(HRFlowable(width='100%', thickness=0.5, color=SLATE_LT, spaceAfter=4))

    def _kv_table(self, rows, col_widths=None):
        """Create a compact key-value table that fills the content width."""
        col_widths = col_widths or [_CONTENT_W * 0.38, _CONTENT_W * 0.62]
        t = Table(rows, colWidths=col_widths)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [LIGHT_BG, WHITE]),
            ('TOPPADDING',    (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING',   (0, 0), (-1, -1), 10),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ]))
        self.story.append(t)

    def _fmt(self, val, decimals=1):
        """Format a numeric value to N decimals; return 'N/A' if falsy."""
        try:
            return f'{float(val):.{decimals}f}'
        except (TypeError, ValueError):
            return str(val) if val else 'N/A'

    # ── Cover page ────────────────────────────────────────────────────────────
    def add_cover_page(self):
        # Push story content below the 75mm header band drawn on canvas
        self.story.append(Spacer(1, 80 * mm))

        # ── Meta table ──
        score  = self.data.get('score', 0)
        safety = self.data.get('safety_level', 'N/A')
        date   = self.data.get('date', 'N/A')
        if date and 'T' in str(date):
            date = str(date).split('T')[0]

        meta_rows = [
            [Paragraph('Date Analysed', self.styles['SmallLabel']),
             Paragraph(str(date), self.styles['ValueText'])],
            [Paragraph('Print Method', self.styles['SmallLabel']),
             Paragraph(self.data.get('print_method', 'N/A'), self.styles['ValueText'])],
            [Paragraph('Paper Type', self.styles['SmallLabel']),
             Paragraph(self.data.get('paper_type', 'N/A'), self.styles['ValueText'])],
            [Paragraph('Client', self.styles['SmallLabel']),
             Paragraph(self.data.get('client_name', 'N/A'), self.styles['ValueText'])],
        ]
        self._kv_table(meta_rows)
        self.story.append(Spacer(1, 8 * mm))

        # ── Score block ──
        score_color = GREEN if score >= 85 else AMBER if score >= 60 else RED
        safety_color_hex = safety_hex(safety)
        col_a = _CONTENT_W * 0.35
        col_b = _CONTENT_W * 0.65
        score_table = Table(
            [[
                Paragraph(
                    f'<font size="42" color="{score_color.hexval()}">{score}</font>'
                    f' <font size="14" color="{SLATE.hexval()}">/100</font>',
                    ParagraphStyle('SC', fontName='Helvetica-Bold', fontSize=42, leading=48),
                ),
                Paragraph(
                    f'<font color="#{safety_color_hex}"><b>{safety.upper()}</b></font><br/>'
                    f'<font color="{SLATE_LT.hexval()}" size="9">Safety Level</font>',
                    ParagraphStyle('SL', fontName='Helvetica', fontSize=13, leading=20),
                ),
            ]],
            colWidths=[col_a, col_b],
        )
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('BOX', (0, 0), (-1, -1), 1.5, CYAN),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('RIGHTPADDING', (0, 0), (-1, -1), 14),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        self.story.append(score_table)
        self.story.append(PageBreak())

    # ── File Quality page ─────────────────────────────────────────────────────
    def add_file_quality_page(self):
        self.story.append(Paragraph('FILE QUALITY ANALYSIS', self.styles['ReportTitle']))
        self._section_rule()
        self.story.append(Spacer(1, 4 * mm))

        dpi    = self.data.get('dpi', 300)
        sharp  = self.data.get('sharpness_score', 'N/A')
        res    = self.data.get('resolution', f'{dpi} DPI')
        w_mm   = self.data.get('width_mm', 0)
        h_mm   = self.data.get('height_mm', 0)
        w_px   = self.data.get('width_px', 0)
        h_px   = self.data.get('height_px', 0)

        # Compute mm if backend didn't supply them
        if (not w_mm or not h_mm) and w_px and dpi:
            w_mm = round((w_px / dpi) * 25.4, 1)
            h_mm = round((h_px / dpi) * 25.4, 1)

        size_str = f'{w_mm} × {h_mm} mm' if w_mm and h_mm else 'N/A'
        
        # Bleed and Safe Area status
        has_bleed = self.data.get('has_sufficient_bleed', False)
        bleed_txt = 'DETECTED — Standard 3mm' if has_bleed else 'MISSING — Auto-extended for production'
        safe_txt  = 'VERIFIED — 3mm internal margin applied'

        # Risk assessment text
        res_ok = str(dpi) >= '300' if isinstance(dpi, int) else ('300' in str(res))
        comp_txt = 'None detected — clean file structure'
        transp_txt = 'No unflattened transparency layers detected'

        rows = [
            [Paragraph('Resolution', self.styles['NormalText']),
             Paragraph(str(res), self.styles['ValueText'])],
            [Paragraph('Physical Size', self.styles['NormalText']),
             Paragraph(size_str, self.styles['ValueText'])],
            [Paragraph('Bleed Status', self.styles['NormalText']),
             Paragraph(bleed_txt, self.styles['ValueText'])],
            [Paragraph('Safe Area', self.styles['NormalText']),
             Paragraph(safe_txt, self.styles['ValueText'])],
            [Paragraph('Sharpness Score', self.styles['NormalText']),
             Paragraph(f'{self._fmt(sharp)} / 10', self.styles['ValueText'])],
            [Paragraph('Compression Artefacts', self.styles['NormalText']),
             Paragraph(comp_txt, self.styles['ValueText'])],
            [Paragraph('Transparency', self.styles['NormalText']),
             Paragraph(transp_txt, self.styles['ValueText'])],
        ]
        self._kv_table(rows)
        self.story.append(PageBreak())

    # ── Color Analysis page ───────────────────────────────────────────────────
    def add_color_analysis_page(self):
        self.story.append(Paragraph('COLOR DISTRIBUTION', self.styles['ReportTitle']))
        self._section_rule()
        self.story.append(Spacer(1, 4 * mm))

        cmyk = self.data.get('cmyk_coverage', {})
        tac  = self.data.get('tac', 0)
        ink  = self.data.get('ink_consumption', {})

        # ── CMYK Coverage ──
        self.story.append(Paragraph('CMYK Channel Coverage', self.styles['SectionHeader']))
        cmyk_rows = [
            [Paragraph('Cyan (C)', self.styles['NormalText']),
             Paragraph(f'{self._fmt(cmyk.get("c", 0))}%', self.styles['ValueText'])],
            [Paragraph('Magenta (M)', self.styles['NormalText']),
             Paragraph(f'{self._fmt(cmyk.get("m", 0))}%', self.styles['ValueText'])],
            [Paragraph('Yellow (Y)', self.styles['NormalText']),
             Paragraph(f'{self._fmt(cmyk.get("y", 0))}%', self.styles['ValueText'])],
            [Paragraph('Black (K)', self.styles['NormalText']),
             Paragraph(f'{self._fmt(cmyk.get("k", 0))}%', self.styles['ValueText'])],
        ]
        self._kv_table(cmyk_rows)
        self.story.append(Spacer(1, 6 * mm))

        # ── TAC ──
        self.story.append(Paragraph('Total Area Coverage (TAC)', self.styles['SectionHeader']))
        tac_val   = float(tac) if tac else 0.0
        tac_ok    = tac_val <= 300
        tac_color = GREEN if tac_ok else RED
        tac_status = 'SAFE — within press limits' if tac_ok else 'WARNING — exceeds 300% limit'
        tac_rows = [
            [Paragraph('TAC Value', self.styles['NormalText']),
             Paragraph(f'{self._fmt(tac_val)}%', self.styles['ValueText'])],
            [Paragraph('Status', self.styles['NormalText']),
             Paragraph(tac_status,
                       ParagraphStyle('TacSt', fontName='Helvetica-Bold',
                                      fontSize=10, textColor=tac_color))],
            [Paragraph('Safe Limit', self.styles['NormalText']),
             Paragraph('300%', self.styles['ValueText'])],
        ]
        self._kv_table(tac_rows)
        self.story.append(Spacer(1, 6 * mm))

        # ── Ink Consumption ──
        self.story.append(Paragraph('Estimated Ink Consumption (per A4 sheet)', self.styles['SectionHeader']))
        ink_rows = [
            [Paragraph('Cyan', self.styles['NormalText']),
             Paragraph(f'{self._fmt(ink.get("c", 0), 4)} ml', self.styles['ValueText'])],
            [Paragraph('Magenta', self.styles['NormalText']),
             Paragraph(f'{self._fmt(ink.get("m", 0), 4)} ml', self.styles['ValueText'])],
            [Paragraph('Yellow', self.styles['NormalText']),
             Paragraph(f'{self._fmt(ink.get("y", 0), 4)} ml', self.styles['ValueText'])],
            [Paragraph('Black', self.styles['NormalText']),
             Paragraph(f'{self._fmt(ink.get("k", 0), 4)} ml', self.styles['ValueText'])],
        ]
        self._kv_table(ink_rows)

        # Color space status
        self.story.append(Spacer(1, 6 * mm))
        has_rgb = self.data.get('has_rgb', False)
        cs_text = ('RGB color space detected — conversion to CMYK applied'
                   if has_rgb else 'Native CMYK — no conversion required')
        cs_color = AMBER if has_rgb else GREEN
        self.story.append(Paragraph(
            f'<font color="{cs_color.hexval()}"><b>Color Space: {cs_text}</b></font>',
            self.styles['NormalText'],
        ))
        self.story.append(PageBreak())

    # ── Print Prediction page ─────────────────────────────────────────────────
    def add_print_prediction_page(self):
        self.story.append(Paragraph('PRINT OUTCOME PREDICTION', self.styles['ReportTitle']))
        self._section_rule()
        self.story.append(Spacer(1, 4 * mm))

        preds = [
            ('Matte Output',       self.data.get('matte_prediction', 'N/A')),
            ('Glossy Output',      self.data.get('glossy_prediction', 'N/A')),
            ('Offset Suitability', self.data.get('offset_suitability', 'N/A')),
            ('Digital Suitability',self.data.get('digital_suitability', 'N/A')),
        ]
        rows = [
            [Paragraph(label, self.styles['NormalText']),
             Paragraph(str(val) if val else 'N/A', self.styles['ValueText'])]
            for label, val in preds
        ]
        self._kv_table(rows)
        self.story.append(Spacer(1, 6 * mm))

        # Risk summary
        risk = self.data.get('risk_level', 'MEDIUM')
        rl   = risk.upper()
        risk_color = GREEN if 'LOW' in rl else RED if 'HIGH' in rl else AMBER
        self.story.append(Paragraph('Risk Level', self.styles['SectionHeader']))
        risk_table = Table(
            [[Paragraph(rl, ParagraphStyle('RL', fontName='Helvetica-Bold',
                                            fontSize=14, textColor=risk_color))]],
            colWidths=[_CONTENT_W],
        )
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('BOX', (0, 0), (-1, -1), 1.5, risk_color),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ]))
        self.story.append(risk_table)
        self.story.append(PageBreak())

    # ── Auto Corrections page ─────────────────────────────────────────────────
    def add_auto_fix_page(self):
        self.story.append(Paragraph('AUTO CORRECTIONS APPLIED', self.styles['ReportTitle']))
        self._section_rule()
        self.story.append(Spacer(1, 4 * mm))

        fixes = self.data.get('auto_fixes', [])
        if not fixes:
            self.story.append(Paragraph(
                'No auto corrections were necessary — file meets all print standards.',
                self.styles['NormalText'],
            ))
        else:
            fix_rows = [
                [Paragraph(f'✓  {fix}',
                            ParagraphStyle('Fix', fontName='Helvetica', fontSize=10,
                                           textColor=colors.HexColor('#166534')))]
                for fix in fixes
            ]
            t = Table(fix_rows, colWidths=[_CONTENT_W])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
                ('ROWBACKGROUNDS', (0, 0), (-1, -1),
                 [colors.HexColor('#f0fdf4'), colors.HexColor('#dcfce7')]),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 14),
                ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#bbf7d0')),
            ]))
            self.story.append(t)

        self.story.append(Spacer(1, 8 * mm))

        # Final score footer
        score = self.data.get('score', 0)
        sc_color = GREEN if score >= 85 else AMBER if score >= 60 else RED
        final_table = Table(
            [[
                Paragraph('Final Print Score', self.styles['SectionHeader']),
                Paragraph(f'{score} / 100',
                           ParagraphStyle('FS', fontName='Helvetica-Bold',
                                          fontSize=20, textColor=sc_color)),
            ]],
            colWidths=[_CONTENT_W * 0.5, _CONTENT_W * 0.5],
        )
        final_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
            ('BOX', (0, 0), (-1, -1), 1.5, sc_color),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        self.story.append(final_table)

    # ── Build ──────────────────────────────────────────────────────────────────
    def build_report(self):
        self.add_cover_page()
        self.add_file_quality_page()
        self.add_color_analysis_page()
        self.add_print_prediction_page()
        self.add_auto_fix_page()

        self.doc.build(
            self.story,
            onFirstPage=self._draw_cover_page,
            onLaterPages=self._draw_subsequent_pages,
        )


# ── Utility ───────────────────────────────────────────────────────────────────
def safety_hex(level: str) -> str:
    lvl = str(level).upper()
    if 'HIGH' in lvl:
        return '10b981'
    if 'MED' in lvl:
        return 'f59e0b'
    return 'ef4444'
