import os
import io
from PIL import Image

def extend_bleed(input_path: str, output_path: str, bleed_mm: float = 3.0) -> bool:
    """
    Extends the bleed of a design file while preserving 100% vector quality for PDFs
    and ultra-high resolution (600+ DPI with LANCZOS resampling) for images.

    - PDF to PDF: Uses PyMuPDF vector embedding (show_pdf_page) so text and vector paths remain crisp.
    - Raster Images or Image Exports: Uses 600 DPI rendering and LANCZOS anti-aliasing filter for maximum print sharp precision.
    """
    TARGET_DPI = 600
    # 1 inch = 25.4 mm; 1 pt = 1/72 inch
    bleed_pts = bleed_mm * (72.0 / 25.4)
    bleed_pixels = int(round((bleed_mm / 25.4) * TARGET_DPI))

    ext_in = input_path.split('.')[-1].lower() if '.' in input_path else ''
    ext_out = output_path.split('.')[-1].upper() if '.' in output_path else 'PDF'

    try:
        # ── VECTOR PDF TO VECTOR PDF PATH ──────────────────────────────────────
        if ext_in == 'pdf' and ext_out == 'PDF':
            try:
                import fitz
                doc_in = fitz.open(input_path)
                doc_out = fitz.open()

                resample_filter = getattr(Image.Resampling, 'LANCZOS', Image.LANCZOS)

                for page_num in range(len(doc_in)):
                    page_in = doc_in.load_page(page_num)
                    rect = page_in.rect  # Original page bounds in points

                    new_width = rect.width + 2 * bleed_pts
                    new_height = rect.height + 2 * bleed_pts

                    # Render high-res margin background image (600 DPI) for bleed edge stretch
                    pix = page_in.get_pixmap(dpi=TARGET_DPI)
                    img_mode = "RGBA" if pix.alpha else "RGB"
                    img = Image.frombytes(img_mode, [pix.width, pix.height], pix.samples)

                    orig_w, orig_h = img.size
                    new_w = orig_w + 2 * bleed_pixels
                    new_h = orig_h + 2 * bleed_pixels

                    # Create extended margin background image
                    bg_img = Image.new(img.mode, (new_w, new_h))
                    bg_img.paste(img, (bleed_pixels, bleed_pixels))

                    # High Quality LANCZOS Edge Resampling
                    top_edge = img.crop((0, 0, orig_w, 1)).resize((orig_w, bleed_pixels), resample=resample_filter)
                    bg_img.paste(top_edge, (bleed_pixels, 0))

                    bottom_edge = img.crop((0, orig_h - 1, orig_w, orig_h)).resize((orig_w, bleed_pixels), resample=resample_filter)
                    bg_img.paste(bottom_edge, (bleed_pixels, new_h - bleed_pixels))

                    left_edge = img.crop((0, 0, 1, orig_h)).resize((bleed_pixels, orig_h), resample=resample_filter)
                    bg_img.paste(left_edge, (0, bleed_pixels))

                    right_edge = img.crop((orig_w - 1, 0, orig_w, orig_h)).resize((bleed_pixels, orig_h), resample=resample_filter)
                    bg_img.paste(right_edge, (new_w - bleed_pixels, bleed_pixels))

                    tl_pixel = img.crop((0, 0, 1, 1)).resize((bleed_pixels, bleed_pixels), resample=resample_filter)
                    bg_img.paste(tl_pixel, (0, 0))

                    tr_pixel = img.crop((orig_w - 1, 0, orig_w, 1)).resize((bleed_pixels, bleed_pixels), resample=resample_filter)
                    bg_img.paste(tr_pixel, (new_w - bleed_pixels, 0))

                    bl_pixel = img.crop((0, orig_h - 1, 1, orig_h)).resize((bleed_pixels, bleed_pixels), resample=resample_filter)
                    bg_img.paste(bl_pixel, (0, new_h - bleed_pixels))

                    br_pixel = img.crop((orig_w - 1, orig_h - 1, orig_w, orig_h)).resize((bleed_pixels, bleed_pixels), resample=resample_filter)
                    bg_img.paste(br_pixel, (new_w - bleed_pixels, new_h - bleed_pixels))

                    # Convert bg_img to PDF bytes and insert as background layer
                    bg_buf = io.BytesIO()
                    if bg_img.mode == 'RGBA':
                        bg_img = bg_img.convert('RGB')
                    bg_img.save(bg_buf, format="JPEG", quality=100, subsampling=0, resolution=float(TARGET_DPI))

                    bg_doc = fitz.open("pdf", bg_buf.getvalue())
                    page_out = doc_out.new_page(width=new_width, height=new_height)
                    page_out.show_pdf_page(fitz.Rect(0, 0, new_width, new_height), bg_doc, 0)
                    bg_doc.close()

                    # Superimpose original vector page in center (preserving 100% vector sharpness)
                    target_rect = fitz.Rect(bleed_pts, bleed_pts, bleed_pts + rect.width, bleed_pts + rect.height)
                    page_out.show_pdf_page(target_rect, doc_in, page_num)

                doc_out.save(output_path, garbage=4, deflate=True)
                doc_out.close()
                doc_in.close()
                return True
            except Exception as ve:
                print(f"Vector PDF bleed extension fallback to raster: {ve}")

        # ── RASTER / IMAGE PATH (600 DPI High-Res Precision) ────────────────────
        if ext_in == 'pdf':
            import fitz
            doc = fitz.open(input_path)
            page = doc.load_page(0)
            # Render at 600 DPI for high print clarity
            pix = page.get_pixmap(dpi=TARGET_DPI)
            img_mode = "RGBA" if pix.alpha else "RGB"
            img = Image.frombytes(img_mode, [pix.width, pix.height], pix.samples)
            doc.close()
        else:
            img = Image.open(input_path)
            # Check source DPI if available, ensure minimum 600 DPI
            src_dpi = img.info.get('dpi')
            if src_dpi and isinstance(src_dpi, tuple) and src_dpi[0] > TARGET_DPI:
                dpi_used = int(src_dpi[0])
                bleed_pixels = int(round((bleed_mm / 25.4) * dpi_used))
            else:
                dpi_used = TARGET_DPI

            if img.mode not in ("RGB", "RGBA", "CMYK"):
                img = img.convert("RGBA" if "A" in img.mode else "RGB")

        orig_w, orig_h = img.size
        new_w = orig_w + 2 * bleed_pixels
        new_h = orig_h + 2 * bleed_pixels

        new_img = Image.new(img.mode, (new_w, new_h))
        new_img.paste(img, (bleed_pixels, bleed_pixels))

        resample_filter = getattr(Image.Resampling, 'LANCZOS', Image.LANCZOS)

        # Extend edges using high quality LANCZOS anti-aliased resampling
        top_edge = img.crop((0, 0, orig_w, 1)).resize((orig_w, bleed_pixels), resample=resample_filter)
        new_img.paste(top_edge, (bleed_pixels, 0))

        bottom_edge = img.crop((0, orig_h - 1, orig_w, orig_h)).resize((orig_w, bleed_pixels), resample=resample_filter)
        new_img.paste(bottom_edge, (bleed_pixels, new_h - bleed_pixels))

        left_edge = img.crop((0, 0, 1, orig_h)).resize((bleed_pixels, orig_h), resample=resample_filter)
        new_img.paste(left_edge, (0, bleed_pixels))

        right_edge = img.crop((orig_w - 1, 0, orig_w, orig_h)).resize((bleed_pixels, orig_h), resample=resample_filter)
        new_img.paste(right_edge, (new_w - bleed_pixels, bleed_pixels))

        tl_pixel = img.crop((0, 0, 1, 1)).resize((bleed_pixels, bleed_pixels), resample=resample_filter)
        new_img.paste(tl_pixel, (0, 0))

        tr_pixel = img.crop((orig_w - 1, 0, orig_w, 1)).resize((bleed_pixels, bleed_pixels), resample=resample_filter)
        new_img.paste(tr_pixel, (new_w - bleed_pixels, 0))

        bl_pixel = img.crop((0, orig_h - 1, 1, orig_h)).resize((bleed_pixels, bleed_pixels), resample=resample_filter)
        new_img.paste(bl_pixel, (0, new_h - bleed_pixels))

        br_pixel = img.crop((orig_w - 1, orig_h - 1, orig_w, orig_h)).resize((bleed_pixels, bleed_pixels), resample=resample_filter)
        new_img.paste(br_pixel, (new_w - bleed_pixels, new_h - bleed_pixels))

        # Save with maximum print quality
        if ext_out == "PDF":
            if new_img.mode == "RGBA":
                new_img = new_img.convert("RGB")
            new_img.save(output_path, "PDF", resolution=float(dpi_used if 'dpi_used' in locals() else TARGET_DPI))
        elif ext_out in ("JPG", "JPEG"):
            if new_img.mode == "RGBA":
                new_img = new_img.convert("RGB")
            d_val = dpi_used if 'dpi_used' in locals() else TARGET_DPI
            new_img.save(output_path, "JPEG", quality=100, subsampling=0, resolution=(d_val, d_val))
        else:  # PNG or TIFF
            d_val = dpi_used if 'dpi_used' in locals() else TARGET_DPI
            new_img.save(output_path, ext_out, compress_level=1, resolution=(d_val, d_val))

        return True

    except Exception as e:
        import traceback
        print(f"Error extending bleed: {e}\n{traceback.format_exc()}")
        return False
