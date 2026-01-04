import { useState } from "react";
import { FileText, Download, Share2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { formatCurrency } from "./LoanSummaryCards";
import { getBankInitials } from "./BankLogos";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Loan {
  id: string;
  bank_name: string;
  loan_account_number: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  emi_amount: number;
  start_date: string;
  country: string;
  status: string;
}

interface EmiEntry {
  id: string;
  emi_month: number;
  emi_date: string;
  emi_amount: number;
  principal_component: number;
  interest_component: number;
  remaining_principal: number;
  payment_status: string;
  payment_method?: string;
  paid_date?: string;
}

interface AmortizationPDFProps {
  loan: Loan;
  schedule: EmiEntry[];
}

export const AmortizationPDF = ({ loan, schedule }: AmortizationPDFProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const currency = loan.country === "USA" ? "USD" : "INR";

  const generatePDF = async (): Promise<Blob> => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Loan Amortization Schedule", pageWidth / 2, 20, { align: "center" });
    
    // Bank and Loan Info
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 10;
    let y = 35;
    
    // Left column
    pdf.setFont("helvetica", "bold");
    pdf.text("Bank:", leftCol, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(loan.bank_name, leftCol + 25, y);
    
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Account:", leftCol, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(loan.loan_account_number, leftCol + 25, y);
    
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Loan Type:", leftCol, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(loan.loan_type, leftCol + 25, y);
    
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Status:", leftCol, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(loan.status.toUpperCase(), leftCol + 25, y);
    
    // Right column
    y = 35;
    pdf.setFont("helvetica", "bold");
    pdf.text("Principal:", rightCol, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(formatCurrency(loan.principal_amount, currency), rightCol + 25, y);
    
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Interest:", rightCol, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${loan.interest_rate}% p.a.`, rightCol + 25, y);
    
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Tenure:", rightCol, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${loan.tenure_months} months`, rightCol + 25, y);
    
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("EMI:", rightCol, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(formatCurrency(loan.emi_amount, currency), rightCol + 25, y);
    
    // Summary stats
    y += 12;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(leftCol, y, pageWidth - 20, y);
    
    y += 8;
    const totalPaid = schedule.filter(e => e.payment_status === "Paid").reduce((sum, e) => sum + Number(e.emi_amount), 0);
    const totalInterest = schedule.reduce((sum, e) => sum + Number(e.interest_component), 0);
    const totalPrincipal = schedule.reduce((sum, e) => sum + Number(e.principal_component), 0);
    const paidEmis = schedule.filter(e => e.payment_status === "Paid").length;
    const pendingEmis = schedule.filter(e => e.payment_status === "Pending").length;
    
    pdf.setFont("helvetica", "bold");
    pdf.text("Summary:", leftCol, y);
    
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.text(`EMIs Paid: ${paidEmis} of ${schedule.length}`, leftCol, y);
    pdf.text(`Total Interest: ${formatCurrency(totalInterest, currency)}`, rightCol, y);
    
    y += 6;
    pdf.text(`Amount Paid: ${formatCurrency(totalPaid, currency)}`, leftCol, y);
    pdf.text(`Remaining EMIs: ${pendingEmis}`, rightCol, y);
    
    // EMI Schedule Table
    y += 12;
    
    const tableData = schedule.map(emi => [
      emi.emi_month.toString(),
      format(parseISO(emi.emi_date), "MMM dd, yyyy"),
      formatCurrency(Number(emi.emi_amount), currency),
      formatCurrency(Number(emi.principal_component), currency),
      formatCurrency(Number(emi.interest_component), currency),
      formatCurrency(Number(emi.remaining_principal), currency),
      emi.payment_status,
      emi.paid_date ? format(parseISO(emi.paid_date), "MMM dd") : "-",
    ]);
    
    autoTable(pdf, {
      startY: y,
      head: [["#", "Date", "EMI", "Principal", "Interest", "Balance", "Status", "Paid On"]],
      body: tableData,
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 22, halign: "right" },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
        6: { cellWidth: 18 },
        7: { cellWidth: 20 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 15, right: 15 },
      didParseCell: (data) => {
        // Color status cells
        if (data.column.index === 6) {
          if (data.cell.raw === "Paid") {
            data.cell.styles.textColor = [34, 139, 34];
          } else if (data.cell.raw === "Pending") {
            data.cell.styles.textColor = [184, 134, 11];
          }
        }
      },
    });
    
    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Generated on ${format(new Date(), "MMM dd, yyyy 'at' HH:mm")} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pdf.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }
    
    return pdf.output("blob");
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generatePDF();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${loan.bank_name}_${loan.loan_type}_Amortization_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded successfully" });
    } catch (error) {
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = async () => {
    setIsGenerating(true);
    try {
      const blob = await generatePDF();
      
      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare) {
        const file = new File(
          [blob], 
          `${loan.bank_name}_Amortization.pdf`, 
          { type: "application/pdf" }
        );
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${loan.bank_name} Loan Amortization Schedule`,
            text: `Loan amortization schedule for ${loan.loan_type} loan from ${loan.bank_name}`,
          });
          toast({ title: "Shared successfully" });
        } else {
          // Fallback: Open WhatsApp with message
          openWhatsAppFallback();
        }
      } else {
        // Fallback for browsers without Web Share API
        openWhatsAppFallback();
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        toast({ title: "Failed to share", variant: "destructive" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const openWhatsAppFallback = () => {
    const message = encodeURIComponent(
      `📊 Loan Amortization Schedule\n\n` +
      `Bank: ${loan.bank_name}\n` +
      `Loan: ${loan.loan_type}\n` +
      `Principal: ${formatCurrency(loan.principal_amount, currency)}\n` +
      `EMI: ${formatCurrency(loan.emi_amount, currency)}\n` +
      `Interest: ${loan.interest_rate}% p.a.\n` +
      `Tenure: ${loan.tenure_months} months\n\n` +
      `Please download the PDF for full schedule.`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
    toast({ title: "Opening WhatsApp..." });
  };

  const handleEmailShare = async () => {
    const subject = encodeURIComponent(`${loan.bank_name} Loan Amortization Schedule`);
    const body = encodeURIComponent(
      `Loan Amortization Schedule\n\n` +
      `Bank: ${loan.bank_name}\n` +
      `Loan Type: ${loan.loan_type}\n` +
      `Account: ${loan.loan_account_number}\n` +
      `Principal: ${formatCurrency(loan.principal_amount, currency)}\n` +
      `EMI: ${formatCurrency(loan.emi_amount, currency)}\n` +
      `Interest: ${loan.interest_rate}% p.a.\n` +
      `Tenure: ${loan.tenure_months} months\n\n` +
      `Please download the attached PDF for the full amortization schedule.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    toast({ title: "Opening email client..." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="border-border"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? "Generating..." : "Export PDF"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem onClick={handleDownload} className="cursor-pointer">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsAppShare} className="cursor-pointer">
          <Share2 className="w-4 h-4 mr-2" />
          Share via WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmailShare} className="cursor-pointer">
          <Mail className="w-4 h-4 mr-2" />
          Share via Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
