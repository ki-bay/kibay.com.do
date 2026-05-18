import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatDopFromCents } from '@/lib/formatMoney';

// jspdf is ~620 KB gzipped and only needed when a customer actually clicks
// "Download invoice". Static-imported it would pay that cost for every
// logged-in user who opens an order details modal. Dynamic-import inside
// the click handler defers it.
const loadJsPdf = async () => {
  const [{ default: jsPDF }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return jsPDF;
};

const InvoiceDownload = ({ order, orderItems, className }) => {
  const { t, i18n } = useTranslation('invoiceDownload');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch a same-origin image and turn it into a base64 dataURL — jsPDF's
  // addImage() works most reliably when given a dataURL.
  const fetchImageAsDataUrl = async (url) => {
    const r = await fetch(url, { cache: 'force-cache' });
    const blob = await r.blob();
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  };

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const jsPDF = await loadJsPdf();
      const doc = new jsPDF();

      // Brand Colors
      const primaryColor = [212, 165, 116]; // #D4A574
      const darkColor = [30, 30, 30];

      const locale = i18n.language?.startsWith('es') ? 'es-DO' : 'en-US';

      // Header
      doc.setFillColor(...darkColor);
      doc.rect(0, 0, 210, 40, 'F');

      // Logo (20% larger than previous text-block: ~36mm wide). Fall back to
      // a text wordmark if the image can't be loaded for any reason.
      try {
        const logoData = await fetchImageAsDataUrl('/logo.png');
        // 4:3 aspect → 36mm wide × 27mm tall, but the header is 40mm tall so
        // we limit height to ~26mm and let the width derive from that.
        doc.addImage(logoData, 'PNG', 20, 7, 36, 26);
      } catch (e) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(29);
        doc.text("KIBAY", 20, 22);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(t('pdf.invoice'), 180, 20, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(t('pdf.tagline'), 60, 22);

      // Order Info
      doc.setTextColor(...darkColor);
      doc.setFontSize(10);
      doc.text(t('pdf.orderNumber', { number: order.order_number }), 20, 55);
      doc.text(t('pdf.date', { date: new Date(order.created_at).toLocaleDateString(locale) }), 20, 60);
      doc.text(t('pdf.status', { status: order.status }), 20, 65);

      // Bill To
      doc.text(t('pdf.billTo'), 120, 55);
      doc.setFont("helvetica", "bold");
      const address = order.shipping_address || {};
      doc.text(`${address.firstName || ''} ${address.lastName || ''}`, 120, 60);
      doc.setFont("helvetica", "normal");
      doc.text(address.address || '', 120, 65);
      doc.text(`${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}`, 120, 70);
      doc.text(address.country || t('pdf.defaultCountry'), 120, 75);

      // Items Table
      const tableColumn = [t('pdf.colItem'), t('pdf.colQuantity'), t('pdf.colUnitPrice'), t('pdf.colTotal')];
      const tableRows = orderItems.map(item => [
        item.product_name,
        item.quantity,
        formatDopFromCents(item.price_per_item),
        formatDopFromCents(item.total_price)
      ]);

      doc.autoTable({
        startY: 85,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: darkColor, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 80 },
          3: { halign: 'right' }
        }
      });

      // Totals
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.text(t('pdf.totalLabel'), 140, finalY);
      doc.text(formatDopFromCents(order.total_amount), 190, finalY, { align: 'right' });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(t('pdf.footer'), 105, 280, { align: 'center' });

      doc.save(`Kibay-Invoice-${order.order_number}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={isGenerating}
      className={className}
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {t('downloadInvoice')}
    </Button>
  );
};

export default InvoiceDownload;