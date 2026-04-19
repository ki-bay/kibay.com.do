import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/api/EcommerceApi';

const InvoiceDownload = ({ order, orderItems, className }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      
      // Brand Colors
      const primaryColor = [212, 165, 116]; // #D4A574
      const darkColor = [30, 30, 30];

      // Header
      doc.setFillColor(...darkColor);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("KIBAY", 20, 20);
      doc.setFontSize(12);
      doc.text("INVOICE", 180, 20, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text("Premium Sparkling Wine", 20, 28);

      // Order Info
      doc.setTextColor(...darkColor);
      doc.setFontSize(10);
      doc.text(`Order Number: ${order.order_number}`, 20, 55);
      doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 60);
      doc.text(`Status: ${order.status}`, 20, 65);

      // Bill To
      doc.text("Bill To:", 120, 55);
      doc.setFont("helvetica", "bold");
      const address = order.shipping_address || {};
      doc.text(`${address.firstName || ''} ${address.lastName || ''}`, 120, 60);
      doc.setFont("helvetica", "normal");
      doc.text(address.address || '', 120, 65);
      doc.text(`${address.city || ''}, ${address.state || ''} ${address.zipCode || ''}`, 120, 70);
      doc.text(address.country || 'Dominican Republic', 120, 75);

      // Items Table
      const tableColumn = ["Item", "Quantity", "Unit Price", "Total"];
      const tableRows = orderItems.map(item => [
        item.product_name,
        item.quantity,
        formatCurrency(item.price_per_item),
        formatCurrency(item.total_price)
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
      doc.text("Subtotal:", 140, finalY);
      doc.text(formatCurrency(order.total_amount), 190, finalY, { align: 'right' });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for choosing Kibay. For support, contact info@kibay.com.do", 105, 280, { align: 'center' });

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
      Download Invoice
    </Button>
  );
};

export default InvoiceDownload;