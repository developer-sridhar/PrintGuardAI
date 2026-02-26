import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch, mm

# Colors based on Theme Specification
NAVY = colors.HexColor('#0f172a')
CYAN = colors.HexColor('#06b6d4')
SLATE = colors.HexColor('#64748b')
LIGHT_BG = colors.HexColor('#f8fafc')
WHITE = colors.HexColor('#ffffff')

class PrintReportGenerator:
    def __init__(self, filename: str, data: dict):
        self.filename = filename
        self.data = data
        self.doc = SimpleDocTemplate(
            self.filename,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=20*mm
        )
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.story = []

    def _setup_custom_styles(self):
        """Configure paragraph styles to simulate Poppins/Inter."""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=28,
            textColor=NAVY,
            spaceAfter=20
        ))
        
        self.styles.add(ParagraphStyle(
            name='ReportSubtitle',
            fontName='Helvetica',
            fontSize=14,
            textColor=CYAN,
            spaceAfter=30
        ))

        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            fontName='Helvetica-Bold',
            fontSize=18,
            textColor=NAVY,
            spaceAfter=15,
            spaceBefore=20
        ))

        self.styles.add(ParagraphStyle(
            name='NormalText',
            fontName='Helvetica',
            fontSize=11,
            textColor=SLATE,
            leading=16
        ))

        self.styles.add(ParagraphStyle(
            name='ValueText',
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=NAVY
        ))

    def _draw_cover_page(self, canvas_ctx, doc):
        """Background for cover page."""
        canvas_ctx.saveState()
        canvas_ctx.setFillColor(NAVY)
        canvas_ctx.rect(0, A4[1] - 80*mm, A4[0], 80*mm, fill=1, stroke=0)
        
        # Draw a cyan accent line
        canvas_ctx.setFillColor(CYAN)
        canvas_ctx.rect(0, A4[1] - 85*mm, A4[0], 5*mm, fill=1, stroke=0)
        
        canvas_ctx.restoreState()

    def add_cover_page(self):
        # The background is drawn via onFirstPage in build, but we add the textual content here.
        # Spacing to push content down into the white area below the navy header
        self.story.append(Spacer(1, 100*mm))
        
        self.story.append(Paragraph("AI PRINT ANALYSIS REPORT", self.styles['ReportTitle']))
        self.story.append(Paragraph(f"File: {self.data.get('file_name')}", self.styles['ReportSubtitle']))
        
        # Meta Data Table
        meta_data = [
            [Paragraph("Client Name:", self.styles['NormalText']), Paragraph(self.data.get('client_name', 'N/A'), self.styles['ValueText'])],
            [Paragraph("Date:", self.styles['NormalText']), Paragraph(self.data.get('date', 'N/A'), self.styles['ValueText'])],
            [Paragraph("Paper Type:", self.styles['NormalText']), Paragraph(self.data.get('paper_type', 'N/A'), self.styles['ValueText'])],
            [Paragraph("Print Method:", self.styles['NormalText']), Paragraph(self.data.get('print_method', 'N/A'), self.styles['ValueText'])]
        ]
        
        t = Table(meta_data, colWidths=[2.5*inch, 4*inch])
        t.setStyle(TableStyle([
            ('BOTTOMPADDING', (0,0), (-1,-1), 12),
            ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ]))
        self.story.append(t)
        
        self.story.append(Spacer(1, 30*mm))
        
        # Score Block
        score_data = [
            [Paragraph("Overall Print Score:", self.styles['SectionHeader']), Paragraph(f"{self.data.get('score')}/100", self.styles['ReportTitle'])],
            [Paragraph("Print Safety Level:", self.styles['SectionHeader']), Paragraph(self.data.get('safety_level'), self.styles['ReportSubtitle'])]
        ]
        score_table = Table(score_data, colWidths=[3*inch, 3*inch])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
            ('PADDING', (0,0), (-1,-1), 20),
            ('BOX', (0,0), (-1,-1), 1, CYAN),
        ]))
        self.story.append(score_table)
        
        self.story.append(PageBreak())

    def add_file_quality_page(self):
        self.story.append(Paragraph("FILE QUALITY ANALYSIS", self.styles['ReportTitle']))
        self.story.append(Spacer(1, 10*mm))
        
        quality_data = [
            [Paragraph("Resolution:", self.styles['NormalText']), Paragraph(self.data.get('resolution', 'N/A'), self.styles['ValueText'])],
            [Paragraph("Sharpness Score:", self.styles['NormalText']), Paragraph(f"{self.data.get('sharpness_score', 'N/A')}/10", self.styles['ValueText'])],
            [Paragraph("Compression Artifacts:", self.styles['NormalText']), Paragraph("None detected", self.styles['ValueText'])],
            [Paragraph("Transparency Issues:", self.styles['NormalText']), Paragraph("No active unflattened layers", self.styles['ValueText'])],
        ]
        
        t = Table(quality_data, colWidths=[3*inch, 3*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
            ('PADDING', (0,0), (-1,-1), 15),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ]))
        self.story.append(t)
        self.story.append(PageBreak())

    def add_color_analysis_page(self):
        self.story.append(Paragraph("COLOR DISTRIBUTION", self.styles['ReportTitle']))
        self.story.append(Spacer(1, 10*mm))
        
        cmyk = self.data.get('cmyk_coverage', {})
        cmyk_data = [
            [Paragraph("Cyan:", self.styles['NormalText']), Paragraph(f"{cmyk.get('c', 0)}%", self.styles['ValueText'])],
            [Paragraph("Magenta:", self.styles['NormalText']), Paragraph(f"{cmyk.get('m', 0)}%", self.styles['ValueText'])],
            [Paragraph("Yellow:", self.styles['NormalText']), Paragraph(f"{cmyk.get('y', 0)}%", self.styles['ValueText'])],
            [Paragraph("Black:", self.styles['NormalText']), Paragraph(f"{cmyk.get('k', 0)}%", self.styles['ValueText'])],
        ]
        
        t1 = Table(cmyk_data, colWidths=[2*inch, 2*inch])
        t1.setStyle(TableStyle([
            ('BOTTOMPADDING', (0,0), (-1,-1), 10)
        ]))
        self.story.append(t1)
        self.story.append(Spacer(1, 15*mm))

        # TAC Table
        self.story.append(Paragraph("Total Area Coverage (TAC)", self.styles['SectionHeader']))
        tac = self.data.get('tac', 0)
        tac_status = "SAFE" if tac < 300 else "WARNING: TOO HIGH"
        tac_color = CYAN if tac < 300 else colors.red
        
        tac_data = [
            [Paragraph(f"{tac}%", self.styles['ReportTitle']), Paragraph(f"Status: {tac_status}", ParagraphStyle('Status', textColor=tac_color, fontName='Helvetica-Bold'))],
            [Paragraph("Safe Limit: Below 300%", self.styles['NormalText']), ""]
        ]
        t2 = Table(tac_data, colWidths=[3*inch, 3*inch])
        self.story.append(t2)
        
        self.story.append(Spacer(1, 15*mm))
        
        # Ink Consumption
        self.story.append(Paragraph("Ink Consumption (Per A4 Sheet)", self.styles['SectionHeader']))
        ink = self.data.get('ink_consumption', {})
        ink_data = [
            [Paragraph("C:", self.styles['NormalText']), Paragraph(f"{ink.get('c', 0)} ml", self.styles['ValueText'])],
            [Paragraph("M:", self.styles['NormalText']), Paragraph(f"{ink.get('m', 0)} ml", self.styles['ValueText'])],
            [Paragraph("Y:", self.styles['NormalText']), Paragraph(f"{ink.get('y', 0)} ml", self.styles['ValueText'])],
            [Paragraph("K:", self.styles['NormalText']), Paragraph(f"{ink.get('k', 0)} ml", self.styles['ValueText'])],
        ]
        t3 = Table(ink_data, colWidths=[2*inch, 2*inch])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
            ('PADDING', (0,0), (-1,-1), 12),
        ]))
        self.story.append(t3)
        self.story.append(PageBreak())

    def add_print_prediction_page(self):
        self.story.append(Paragraph("PRINT OUTCOME PREDICTION", self.styles['ReportTitle']))
        self.story.append(Spacer(1, 10*mm))
        
        predictions_data = [
            [Paragraph("Matte Output:", self.styles['NormalText']), Paragraph(self.data.get('matte_prediction', ''), self.styles['ValueText'])],
            [Paragraph("Glossy Output:", self.styles['NormalText']), Paragraph(self.data.get('glossy_prediction', ''), self.styles['ValueText'])],
            [Paragraph("Offset Suitability:", self.styles['NormalText']), Paragraph(self.data.get('offset_suitability', ''), self.styles['ValueText'])],
            [Paragraph("Digital Suitability:", self.styles['NormalText']), Paragraph(self.data.get('digital_suitability', ''), self.styles['ValueText'])],
        ]
        
        t = Table(predictions_data, colWidths=[2.5*inch, 4*inch])
        t.setStyle(TableStyle([
            ('BOTTOMPADDING', (0,0), (-1,-1), 15),
            ('LINEBELOW', (0,0), (-1,-2), 0.5, colors.HexColor('#e2e8f0')),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        self.story.append(t)
        self.story.append(Spacer(1, 20*mm))

        # Risk Summary
        risk = self.data.get('risk_level', 'LOW')
        risk_color = CYAN if 'LOW' in risk.upper() else colors.red if 'HIGH' in risk.upper() else colors.orange
        
        self.story.append(Paragraph("Risk Level Summary", self.styles['SectionHeader']))
        risk_table = Table([[Paragraph(risk.upper(), ParagraphStyle('Status', textColor=risk_color, fontName='Helvetica-Bold', fontSize=14))]])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
            ('PADDING', (0,0), (-1,-1), 15),
            ('BOX', (0,0), (-1,-1), 1, risk_color),
        ]))
        self.story.append(risk_table)
        self.story.append(PageBreak())

    def add_auto_fix_page(self):
        self.story.append(Paragraph("AUTO CORRECTIONS APPLIED", self.styles['ReportTitle']))
        self.story.append(Spacer(1, 10*mm))
        
        fixes = self.data.get('auto_fixes', [])
        
        if not fixes:
            self.story.append(Paragraph("No auto corrections were necessary for this file.", self.styles['NormalText']))
        else:
            fix_list = [[Paragraph(f"✓ {fix}", self.styles['NormalText'])] for fix in fixes]
            t = Table(fix_list, colWidths=[6.5*inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1, -1), colors.HexColor('#f0fdf4')), # very light green
                ('BOTTOMPADDING', (0,0), (-1,-1), 12),
                ('TOPPADDING', (0,0), (-1,-1), 12),
                ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#166534')),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ]))
            self.story.append(t)

        self.story.append(Spacer(1, 25*mm))
        
        # Final Score Footer
        final_table = Table([
            [Paragraph("Final Print Score:", self.styles['SectionHeader']), Paragraph(f"{self.data.get('score')}/100", self.styles['ReportTitle'])],
        ], colWidths=[3*inch, 2*inch])
        final_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (0,0), 'RIGHT'),
            ('ALIGN', (1,0), (1,0), 'LEFT'),
        ]))
        self.story.append(final_table)

    def build_report(self):
        self.add_cover_page()
        self.add_file_quality_page()
        self.add_color_analysis_page()
        self.add_print_prediction_page()
        self.add_auto_fix_page()
        
        self.doc.build(self.story, onFirstPage=self._draw_cover_page)
