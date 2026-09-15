/* Saving the certificate without the browser's print dialog.

   window.print() hands the result to whatever that dialog is set to: the
   author's own print came out with Chrome's header and footer across it
   (date, page title, the full URL, "1/1") and the sheet scaled down
   inside default margins. None of that is reachable from CSS — @page
   asks for A4 with no margin and the page measures exactly 210x297mm,
   but the dialog wins.

   So the page builds the file itself: html2canvas rasterises the
   certificate, and the few hundred bytes of PDF around that image are
   written here. jsPDF would also do it, at 410KB, nearly all of which is
   font machinery for text we are not placing — this is one image on one
   page, and that is about forty lines. */
(() => {
  const A4W = 595.276, A4H = 841.89;          // A4 in PostScript points

  const enc = new TextEncoder();
  const bytes = v => typeof v === 'string' ? enc.encode(v) : v;

  function buildPdf(jpeg, w, h) {
    const objs = [
      '<</Type/Catalog/Pages 2 0 R>>',
      '<</Type/Pages/Kids[3 0 R]/Count 1>>',
      '<</Type/Page/Parent 2 0 R/MediaBox[0 0 ' + A4W + ' ' + A4H + ']' +
        '/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>',
      null,                                    // the image, written below
      null                                     // the content stream
    ];
    const draw = 'q ' + A4W + ' 0 0 ' + A4H + ' 0 0 cm /Im0 Do Q\n';

    const parts = [];
    let len = 0;
    const push = p => { const b = bytes(p); parts.push(b); len += b.length; };

    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const offsets = [0];
    for (let i = 0; i < objs.length; i++) {
      offsets.push(len);
      push((i + 1) + ' 0 obj\n');
      if (i === 3) {
        push('<</Type/XObject/Subtype/Image/Width ' + w + '/Height ' + h +
             '/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ' +
             jpeg.length + '>>\nstream\n');
        push(jpeg);
        push('\nendstream');
      } else if (i === 4) {
        push('<</Length ' + draw.length + '>>\nstream\n' + draw + 'endstream');
      } else {
        push(objs[i]);
      }
      push('\nendobj\n');
    }
    const xref = len;
    let table = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
    for (let i = 1; i <= objs.length; i++) {
      table += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    push(table);
    push('trailer\n<</Size ' + (objs.length + 1) + '/Root 1 0 R>>\nstartxref\n' + xref + '\n%%EOF\n');

    const out = new Uint8Array(len);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }

  /* 2.5x of the 794px sheet is 1985px across an A4 width — about 240 dpi,
     which prints cleanly and keeps the file near a megabyte. */
  async function savePdf(el, filename) {
    const canvas = await window.html2canvas(el, {
      scale: 2.5, backgroundColor: '#ffffff', useCORS: true, logging: false,
      windowWidth: el.offsetWidth, windowHeight: el.offsetHeight
    });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const bin = atob(b64);
    const jpeg = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i);

    const pdf = buildPdf(jpeg, canvas.width, canvas.height);
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  window.PE_savePdf = savePdf;
})();
