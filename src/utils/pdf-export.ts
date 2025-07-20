import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendance, Contribution, Event, Member, Expense, Leadership } from '../types';
import { formatDate } from './date-utils';
import { formatUGX } from './currency-utils';

// Professional PDF styling with clear, bright colors
const COLORS = {
  primary: '#1e40af',      // Deep blue
  yellow: '#d97706',       // Bright orange-yellow
  secondary: '#dc2626',    // Clear red
  success: '#059669',      // Clear green
  danger: '#dc2626',       // Clear red
  warning: '#d97706',      // Orange
  info: '#0284c7',         // Clear blue
  gray: '#374151',         // Dark gray
  lightGray: '#f8fafc',    // Very light gray
  darkGray: '#111827',     // Very dark gray
  white: '#ffffff',
  black: '#000000',
  brightWhite: '#ffffff',  // Ensure bright white for text
};

const FONTS = {
  title: 20,
  subtitle: 16,
  heading: 14,
  body: 11,
  small: 9,
  tiny: 8,
};

/**
 * Professional PDF export class with proper page break management
 */
class BasePDFExporter {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number = 20;
  protected currentY: number = 20;
  protected footerHeight: number = 40; // Reserved space for footer
  protected headerHeight: number = 100; // Reserved space for header

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF(orientation, 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Add professional header with properly positioned manager details
   */
  protected addHeader(title: string, subtitle?: string): void {
    // Clean header background with subtle gradient
    this.addGradientBackground(0, 0, this.pageWidth, 60, COLORS.primary, COLORS.info);
    
    // Team name with clear, bright white text
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(255, 255, 255); // Bright white
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FC256', this.margin, this.margin + 15);
    
    // Core values in bright white
    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(255, 255, 255); // Bright white
    this.doc.text('Excellence • Discipline • Teamwork', this.margin, this.margin + 25);
    
    // Manager contact section - properly positioned and sized
    const contactBoxWidth = 75;
    const contactBoxHeight = 32;
    const contactX = this.pageWidth - contactBoxWidth - this.margin;
    const contactY = this.margin + 10;
    
    // White background box for manager details
    this.doc.setFillColor(255, 255, 255); // Pure white background
    this.doc.roundedRect(contactX, contactY, contactBoxWidth, contactBoxHeight, 3, 3, 'F');
    
    // Border for the contact box
    this.doc.setDrawColor(COLORS.yellow);
    this.doc.setLineWidth(1.5);
    this.doc.roundedRect(contactX, contactY, contactBoxWidth, contactBoxHeight, 3, 3, 'S');
    
    // Manager details with proper spacing and positioning
    const textX = contactX + 4;
    let textY = contactY + 7;
    
    // Header
    this.doc.setFontSize(FONTS.tiny);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TEAM MANAGER', textX, textY);
    textY += 6;
    
    // Manager name
    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(COLORS.primary);
    this.doc.text('Pius Paul', textX, textY);
    textY += 5;
    
    // Contact details with proper spacing
    this.doc.setFontSize(FONTS.tiny);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(COLORS.darkGray);
    
    this.doc.text('Email: piuspaul392@gmail.com', textX, textY);
    textY += 4;
    this.doc.text('Phone: +256782633089', textX, textY);
    textY += 4;
    this.doc.text('Position: Team Manager', textX, textY);
    
    // Professional separator line
    this.doc.setDrawColor(COLORS.yellow);
    this.doc.setLineWidth(2);
    this.doc.line(this.margin, 65, this.pageWidth - this.margin, 65);
    
    // Report title with clear, dark text
    this.doc.setFontSize(FONTS.subtitle);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, 80);
    
    if (subtitle) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, 88);
    }
    
    this.currentY = this.headerHeight;
  }

  /**
   * Add subtle gradient background
   */
  protected addGradientBackground(x: number, y: number, width: number, height: number, startColor: string, endColor: string): void {
    const steps = 20;
    const stepHeight = height / steps;
    
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const color = this.interpolateColor(startColor, endColor, ratio);
      this.doc.setFillColor(color);
      this.doc.rect(x, y + (i * stepHeight), width, stepHeight, 'F');
    }
  }

  /**
   * Interpolate between two colors
   */
  protected interpolateColor(color1: string, color2: string, ratio: number): string {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Add professional statistics cards with clear text
   */
  protected addStatsSection(stats: { label: string; value: string; color?: string }[]): void {
    const cardWidth = (this.pageWidth - this.margin * 2 - 8 * (stats.length - 1)) / stats.length;
    const cardHeight = 35;

    // Check if we have enough space for stats section
    this.checkPageBreak(cardHeight + 25);

    stats.forEach((stat, index) => {
      const x = this.margin + index * (cardWidth + 8);
      
      // Card shadow for depth
      this.doc.setFillColor(0, 0, 0, 0.1);
      this.doc.roundedRect(x + 2, this.currentY + 2, cardWidth, cardHeight, 4, 4, 'F');
      
      // Card background - clean white
      this.doc.setFillColor(255, 255, 255);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 4, 4, 'F');
      
      // Card border with color
      const cardColor = stat.color || COLORS.primary;
      this.doc.setDrawColor(cardColor);
      this.doc.setLineWidth(2);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 4, 4, 'S');
      
      // Colored top bar
      this.doc.setFillColor(cardColor);
      this.doc.roundedRect(x, this.currentY, cardWidth, 8, 4, 4, 'F');
      this.doc.rect(x, this.currentY + 4, cardWidth, 4, 'F');
      
      // Label with clear, dark text
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(stat.label, x + cardWidth / 2, this.currentY + 18, { align: 'center' });
      
      // Value with bold, dark text
      this.doc.setFontSize(FONTS.heading);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.text(stat.value, x + cardWidth / 2, this.currentY + 28, { align: 'center' });
    });

    this.currentY += cardHeight + 25;
  }

  /**
   * Add professional section heading with clear text
   */
  protected addSectionHeading(title: string, color: string = COLORS.primary): void {
    this.checkPageBreak(25);
    
    // Clean background bar
    this.doc.setFillColor(color);
    this.doc.rect(this.margin - 5, this.currentY - 3, this.pageWidth - this.margin * 2 + 10, 18, 'F');
    
    // Title text in bright white
    this.doc.setFontSize(FONTS.heading);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY + 8);
    
    this.currentY += 30;
  }

  /**
   * Add professional table with proper page break management
   */
  protected addTable(
    columns: { header: string; dataKey: string; width?: number }[],
    rows: any[],
    options: { title?: string; headerColor?: string } = {}
  ): void {
    // Debug logging
    console.log('Adding table with data:', {
      columns: columns.length,
      rows: rows.length,
      sampleRow: rows[0],
      title: options.title
    });

    // Ensure we have enough space for at least the title and a few rows
    const estimatedTableHeight = 60 + (Math.min(rows.length, 5) * 8); // Rough estimate
    this.checkPageBreak(estimatedTableHeight);

    if (options.title) {
      this.addSectionHeading(options.title, options.headerColor);
    }

    // If no data, show empty message
    if (rows.length === 0) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor('#6b7280');
      this.doc.setFont('helvetica', 'italic');
      this.doc.text(
        'No data available for this section.',
        this.margin,
        this.currentY
      );
      this.currentY += 20;
      return;
    }
    const headerColor = options.headerColor || COLORS.primary;

    // Calculate available space for table
    const availableHeight = this.pageHeight - this.currentY - this.footerHeight;

    // Calculate column widths to prevent overlapping
    const totalWidth = this.pageWidth - this.margin * 2;
    const columnWidths = columns.map(col => {
      if (col.width) return col.width;
      return totalWidth / columns.length; // Equal distribution if no width specified
    });

    // Ensure total width doesn't exceed page width
    const totalColumnWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    if (totalColumnWidth > totalWidth) {
      const scaleFactor = totalWidth / totalColumnWidth;
      columnWidths.forEach((width, index) => {
        columnWidths[index] = width * scaleFactor;
      });
    }

    // Process table data to ensure proper formatting
    const processedRows = rows.map(row => 
      columns.map(col => {
        const value = row[col.dataKey];
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      })
    );

    console.log('Processed table data:', {
      headers: columns.map(col => col.header),
      processedRows: processedRows.slice(0, 3), // First 3 rows for debugging
      totalRows: processedRows.length
    });
    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: processedRows,
      startY: this.currentY,
      styles: { 
        fontSize: FONTS.small, // Reduced font size to prevent overlapping
        cellPadding: 3, // Reduced padding
        textColor: COLORS.darkGray,
        lineColor: '#e5e7eb',
        lineWidth: 0.5,
        fillColor: false,
        overflow: 'linebreak', // Enable text wrapping
        halign: 'left', // Left align text
        valign: 'middle', // Vertically center text
      },
      headStyles: { 
        fillColor: headerColor,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: FONTS.small, // Consistent font size
        cellPadding: 4,
        halign: 'center', // Center align headers
        valign: 'middle',
      },
      alternateRowStyles: { 
        fillColor: '#f9fafb'
      },
      columnStyles: columnWidths.reduce((acc, width, index) => {
        acc[index] = { 
          cellWidth: width,
          overflow: 'linebreak',
          cellPadding: 3,
        };
        return acc;
      }, {} as any),
      margin: { 
        left: this.margin, 
        right: this.margin,
        bottom: this.footerHeight + 10 // Ensure space for footer
      },
      theme: 'grid',
      pageBreak: 'auto',
      showHead: 'everyPage',
      tableWidth: 'wrap', // Auto-size table width
      // Improved text handling
      didParseCell: function(data: any) {
        // Ensure text doesn't overflow
        if (data.cell.text && data.cell.text.length > 0) {
          const maxLength = Math.floor(data.cell.width / 3); // Approximate character limit
          if (data.cell.text[0].length > maxLength) {
            data.cell.text = [data.cell.text[0].substring(0, maxLength - 3) + '...'];
          }
        }
      },
      // Ensure proper spacing from footer
      didDrawPage: (data: any) => {
        // Update currentY to account for table content
        this.currentY = data.cursor.y;
      },
      // Add page break logic to prevent overlap
      willDrawPage: (data: any) => {
        // Check if we're too close to the footer
        if (data.cursor.y > this.pageHeight - this.footerHeight - 20) {
          this.doc.addPage();
          this.currentY = this.margin + 20;
          return false; // Don't draw on this page
        }
        return true;
      }
    });

    // Update currentY position after table
    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
    
    // Ensure we don't get too close to footer
    if (this.currentY > this.pageHeight - this.footerHeight - 20) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
    }
  }

  /**
   * Add professional footer with clear text and proper positioning
   */
  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      const footerY = this.pageHeight - 25;
      
      // Footer line
      this.doc.setDrawColor(COLORS.yellow);
      this.doc.setLineWidth(1);
      this.doc.line(this.margin, footerY - 8, this.pageWidth - this.margin, footerY - 8);

      // Page number - positioned clearly
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        footerY - 2,
        { align: 'right' }
      );

      // Generation info - positioned clearly
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.text(
        `Generated: ${formatDate(new Date().toISOString(), 'MMM d, yyyy')} at ${new Date().toLocaleTimeString()}`,
        this.margin,
        footerY - 2
      );

      // Confidentiality notice - positioned clearly
      this.doc.setFontSize(FONTS.tiny);
      this.doc.setTextColor(COLORS.gray);
      this.doc.text(
        'Confidential - FC256 Internal Report',
        this.pageWidth / 2,
        footerY + 5,
        { align: 'center' }
      );
    }
  }

  /**
   * Enhanced page break check with proper footer spacing
   */
  protected checkPageBreak(requiredHeight: number = 35): void {
    // Calculate if we have enough space including footer buffer
    const availableSpace = this.pageHeight - this.currentY - this.footerHeight - 10;
    
    if (requiredHeight > availableSpace) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
    }
  }

  /**
   * Save the PDF with timestamp
   */
  protected save(filename: string): void {
    this.addFooter();
    const timestamp = new Date().toISOString().split('T')[0];
    this.doc.save(`${filename}-${timestamp}.pdf`);
  }
}

/**
 * Dashboard PDF Export with Date Filtering
 */
export class DashboardPDFExporter extends BasePDFExporter {
  exportDashboard(data: {
    stats: {
      totalMembers: number;
      activeMembers: number;
      trainingSessionsThisMonth: number;
      friendliesThisMonth: number;
      totalContributions: number;
      totalExpenses: number;
      remainingBalance: number;
    };
    upcomingEvents: Event[];
    recentTransactions: any[];
    attendanceTrends?: any[];
    contributionTrends?: any[];
    dateRange?: { startDate: string; endDate: string };
  }): void {
    console.log('Exporting dashboard with data:', {
      stats: data.stats,
      upcomingEventsCount: data.upcomingEvents.length,
      recentTransactionsCount: data.recentTransactions.length,
      attendanceTrendsCount: data.attendanceTrends?.length || 0
    });

    const dateRangeText = data.dateRange 
      ? `Filtered: ${formatDate(data.dateRange.startDate)} to ${formatDate(data.dateRange.endDate)}`
      : `Generated: ${formatDate(new Date().toISOString())}`;
      
    this.addHeader(
      data.dateRange ? 'FILTERED DASHBOARD REPORT' : 'DASHBOARD OVERVIEW', 
      `Team Performance Analysis - ${dateRangeText}`
    );

    // Add date range notice if filtering is applied
    if (data.dateRange) {
      this.checkPageBreak(30);
      
      // Date range info box
      this.doc.setFillColor('#dbeafe'); // Light blue background
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - this.margin * 2, 25, 4, 4, 'F');
      
      this.doc.setDrawColor('#3b82f6'); // Blue border
      this.doc.setLineWidth(1);
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - this.margin * 2, 25, 4, 4, 'S');
      
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor('#1e40af'); // Dark blue text
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('📅 FILTERED REPORT', this.margin + 5, this.currentY + 8);
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor('#374151'); // Dark gray text
      this.doc.text(
        `This report contains data filtered from ${formatDate(data.dateRange.startDate, 'MMM d, yyyy')} to ${formatDate(data.dateRange.endDate, 'MMM d, yyyy')}`,
        this.margin + 5,
        this.currentY + 16
      );
      
      this.currentY += 35;
    }

    // Team statistics with clear colors
    this.addStatsSection([
      { 
        label: 'Active Members', 
        value: data.stats.activeMembers.toString(),
        color: COLORS.success,
      },
      { 
        label: data.dateRange ? 'Training (Period)' : 'Training Sessions', 
        value: data.stats.trainingSessionsThisMonth.toString(),
        color: COLORS.info,
      },
      { 
        label: data.dateRange ? 'Friendlies (Period)' : 'Friendly Matches', 
        value: data.stats.friendliesThisMonth.toString(),
        color: COLORS.warning,
      },
      { 
        label: data.dateRange ? 'Period Balance' : 'Team Balance', 
        value: formatUGX(data.stats.remainingBalance),
        color: data.stats.remainingBalance >= 0 ? COLORS.success : COLORS.danger,
      },
    ]);

    // Financial Summary with period context
    this.addSectionHeading(
      data.dateRange ? 'FINANCIAL SUMMARY (FILTERED PERIOD)' : 'FINANCIAL SUMMARY', 
      COLORS.success
    );
    
    const financialData = [
      { 
        metric: data.dateRange ? 'Period Contributions' : 'Total Contributions', 
        amount: formatUGX(data.stats.totalContributions),
        status: 'Income',
        category: 'Positive'
      },
      { 
        metric: data.dateRange ? 'Period Expenses' : 'Total Expenses', 
        amount: formatUGX(data.stats.totalExpenses),
        status: 'Outgoing',
        category: 'Negative'
      },
      { 
        metric: data.stats.remainingBalance >= 0 
          ? (data.dateRange ? 'Period Surplus' : 'Available Balance')
          : (data.dateRange ? 'Period Deficit' : 'Deficit'), 
        amount: formatUGX(Math.abs(data.stats.remainingBalance)),
        status: data.stats.remainingBalance >= 0 ? 'Positive' : 'Negative',
        category: data.stats.remainingBalance >= 0 ? 'Surplus' : 'Deficit'
      },
    ];

    console.log('Financial data for export:', financialData);
    this.addTable(
      [
        { header: 'Financial Metric', dataKey: 'metric', width: 60 },
        { header: 'Amount (UGX)', dataKey: 'amount', width: 45 },
        { header: 'Status', dataKey: 'status', width: 30 },
        { header: 'Category', dataKey: 'category', width: 35 },
      ],
      financialData,
      { headerColor: COLORS.success }
    );

    // Upcoming Events
    if (data.upcomingEvents.length > 0) {
      const eventRows = data.upcomingEvents.slice(0, 8).map(event => ({
        date: formatDate(event.date, 'MMM d, yyyy'),
        type: event.type === 'training' ? 'Training Session' : `Friendly vs ${event.opponent}`,
        time: event.time,
        location: event.location,
        status: 'Scheduled',
      }));

      console.log('Event rows for export:', eventRows);
      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 35 },
          { header: 'Event Type', dataKey: 'type', width: 55 },
          { header: 'Time', dataKey: 'time', width: 25 },
          { header: 'Location', dataKey: 'location', width: 45 },
          { header: 'Status', dataKey: 'status', width: 25 },
        ],
        eventRows,
        { 
          title: data.dateRange ? 'UPCOMING EVENTS (IN FILTERED PERIOD)' : 'UPCOMING EVENTS', 
          headerColor: COLORS.info 
        }
      );
    }

    // Recent Transactions
    if (data.recentTransactions.length > 0) {
      const transactionRows = data.recentTransactions.slice(0, 12).map(transaction => ({
        date: formatDate(transaction.date, 'MMM d, yyyy'),
        type: transaction.type === 'contribution' ? 'Income' : 'Expense',
        description: transaction.description,
        amount: `${transaction.type === 'contribution' ? '+' : '-'}${formatUGX(transaction.amount)}`,
        status: transaction.type === 'contribution' ? 'Credit' : 'Debit',
        category: transaction.category || 'General'
      }));

      console.log('Transaction rows for export:', transactionRows.slice(0, 3));
      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 30 },
          { header: 'Type', dataKey: 'type', width: 25 },
          { header: 'Description', dataKey: 'description', width: 60 },
          { header: 'Amount', dataKey: 'amount', width: 35 },
          { header: 'Status', dataKey: 'status', width: 25 },
        ],
        transactionRows,
        { 
          title: data.dateRange ? 'TRANSACTIONS (FILTERED PERIOD)' : 'RECENT TRANSACTIONS', 
          headerColor: COLORS.warning 
        }
      );
    }

    // Attendance Trends if available
    if (data.attendanceTrends && data.attendanceTrends.length > 0) {
      const attendanceRows = data.attendanceTrends.slice(0, 10).map(trend => ({
        date: formatDate(trend.date, 'MMM d, yyyy'),
        session: trend.type === 'training' ? 'Training Session' : `Friendly vs ${trend.opponent}`,
        present: trend.presentCount.toString(),
        total: trend.totalMembers.toString(),
        rate: `${Math.round(trend.attendanceRate)}%`,
        status: trend.attendanceRate >= 80 ? 'Excellent' : trend.attendanceRate >= 60 ? 'Good' : 'Poor'
      }));

      console.log('Attendance rows for export:', attendanceRows);
      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 30 },
          { header: 'Session Type', dataKey: 'session', width: 50 },
          { header: 'Present', dataKey: 'present', width: 20 },
          { header: 'Total', dataKey: 'total', width: 20 },
          { header: 'Rate', dataKey: 'rate', width: 20 },
          { header: 'Status', dataKey: 'status', width: 25 },
        ],
        attendanceRows,
        { 
          title: data.dateRange ? 'ATTENDANCE TRENDS (FILTERED PERIOD)' : 'ATTENDANCE TRENDS', 
          headerColor: COLORS.primary 
        }
      );
    } else if (data.dateRange) {
      // Show message if no attendance data in filtered period
      this.addSectionHeading('ATTENDANCE TRENDS (FILTERED PERIOD)', COLORS.primary);
      
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor('#6b7280');
      this.doc.setFont('helvetica', 'italic');
      this.doc.text(
        'No training sessions with attendance records found in the selected date range.',
        this.margin,
        this.currentY
      );
      this.currentY += 20;
    }

    // Add summary note for filtered reports
    if (data.dateRange) {
      this.checkPageBreak(40);
      
      this.doc.setFillColor('#f3f4f6'); // Light gray background
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - this.margin * 2, 35, 4, 4, 'F');
      
      this.doc.setDrawColor('#9ca3af'); // Gray border
      this.doc.setLineWidth(1);
      this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - this.margin * 2, 35, 4, 4, 'S');
      
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor('#374151');
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('📊 REPORT SUMMARY', this.margin + 5, this.currentY + 8);
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `This filtered report shows data from ${formatDate(data.dateRange.startDate, 'MMM d, yyyy')} to ${formatDate(data.dateRange.endDate, 'MMM d, yyyy')}.`,
        this.margin + 5,
        this.currentY + 16
      );
      
      this.doc.text(
        'Financial figures represent transactions within this period only, not cumulative totals.',
        this.margin + 5,
        this.currentY + 24
      );
      
      this.currentY += 45;
    }

    const filename = data.dateRange 
      ? `fc256-dashboard-filtered-${data.dateRange.startDate}-to-${data.dateRange.endDate}`
      : 'fc256-dashboard';
      
    this.save(filename);
  }
}

/**
 * Members PDF Export with enhanced page break management
 */
export class MembersPDFExporter extends BasePDFExporter {
  exportMembers(members: Member[]): void {
    console.log('Exporting members:', members.length);
    
    this.addHeader(
      'TEAM MEMBERS DIRECTORY', 
      `Complete roster with ${members.length} registered members`
    );

    // Member statistics
    const activeMembers = members.filter(m => m.status === 'active').length;
    const inactiveMembers = members.filter(m => m.status === 'inactive').length;
    const injuredMembers = members.filter(m => m.status === 'injured').length;
    const suspendedMembers = members.filter(m => m.status === 'suspended').length;

    this.addStatsSection([
      { 
        label: 'Total Members', 
        value: members.length.toString(),
        color: COLORS.primary,
      },
      { 
        label: 'Active Players', 
        value: activeMembers.toString(),
        color: COLORS.success,
      },
      { 
        label: 'Inactive', 
        value: inactiveMembers.toString(),
        color: COLORS.warning,
      },
      { 
        label: 'Injured/Suspended', 
        value: (injuredMembers + suspendedMembers).toString(),
        color: COLORS.danger,
      },
    ]);

    // Position breakdown
    const positionCounts = members.reduce((acc, member) => {
      acc[member.position] = (acc[member.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const positionData = Object.entries(positionCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([position, count]) => ({
        position: position,
        count: count.toString(),
        percentage: `${Math.round((count / members.length) * 100)}%`,
        status: count >= 3 ? 'Well Covered' : count >= 2 ? 'Adequate' : 'Needs Attention'
      }));

    console.log('Position data for export:', positionData);
    this.addTable(
      [
        { header: 'Position', dataKey: 'position', width: 40 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
        { header: 'Coverage Status', dataKey: 'status', width: 30 },
      ],
      positionData,
      { title: 'SQUAD COMPOSITION BY POSITION', headerColor: COLORS.info }
    );

    // Complete member roster with proper page management
    const memberRows = members
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
      .map(member => ({
        jersey: `#${member.jerseyNumber}`,
        name: member.name,
        position: member.position,
        status: member.status.charAt(0).toUpperCase() + member.status.slice(1),
        email: member.email,
        phone: member.phone,
        joined: formatDate(member.dateJoined, 'MMM d, yyyy'),
      }));

    console.log('Member rows for export:', memberRows.slice(0, 3)); // First 3 for debugging
    this.addTable(
      [
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Full Name', dataKey: 'name', width: 35 },
        { header: 'Position', dataKey: 'position', width: 30 },
        { header: 'Status', dataKey: 'status', width: 20 },
        { header: 'Email Address', dataKey: 'email', width: 45 },
        { header: 'Phone Number', dataKey: 'phone', width: 25 },
        { header: 'Date Joined', dataKey: 'joined', width: 25 },
      ],
      memberRows,
      { title: 'COMPLETE TEAM ROSTER', headerColor: COLORS.primary }
    );

    this.save('fc256-members');
  }
}

/**
 * Contributions & Expenses PDF Export
 */
export class ContributionsPDFExporter extends BasePDFExporter {
  exportContributions(data: {
    contributions: Contribution[];
    expenses: Expense[];
    members: Member[];
    totalContributions: number;
    totalExpenses: number;
    remainingBalance: number;
  }): void {
    this.addHeader(
      'FINANCIAL REPORT', 
      `Contributions & Expenses Analysis - ${formatDate(new Date().toISOString())}`
    );

    // Financial overview
    this.addStatsSection([
      { 
        label: 'Total Income', 
        value: formatUGX(data.totalContributions),
        color: COLORS.success,
      },
      { 
        label: 'Total Expenses', 
        value: formatUGX(data.totalExpenses),
        color: COLORS.danger,
      },
      { 
        label: data.remainingBalance >= 0 ? 'Net Balance' : 'Deficit', 
        value: formatUGX(Math.abs(data.remainingBalance)),
        color: data.remainingBalance >= 0 ? COLORS.success : COLORS.warning,
      },
      { 
        label: 'Total Transactions', 
        value: (data.contributions.length + data.expenses.length).toString(),
        color: COLORS.info,
      },
    ]);

    // Contribution analysis
    if (data.contributions.length > 0) {
      const contributionsByType = data.contributions.reduce((acc, contrib) => {
        acc[contrib.type] = (acc[contrib.type] || 0) + (contrib.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      const contributionTypeData = Object.entries(contributionsByType).map(([type, amount]) => ({
        type: type === 'monetary' ? 'Monetary Contributions' : 'In-Kind Contributions',
        amount: formatUGX(amount),
        count: data.contributions.filter(c => c.type === type).length.toString(),
        percentage: `${Math.round((amount / data.totalContributions) * 100)}%`,
        average: formatUGX(amount / data.contributions.filter(c => c.type === type).length)
      }));

      this.addTable(
        [
          { header: 'Contribution Type', dataKey: 'type', width: 40 },
          { header: 'Total Amount', dataKey: 'amount', width: 30 },
          { header: 'Count', dataKey: 'count', width: 20 },
          { header: 'Percentage', dataKey: 'percentage', width: 25 },
          { header: 'Average', dataKey: 'average', width: 25 },
        ],
        contributionTypeData,
        { title: 'CONTRIBUTIONS ANALYSIS BY TYPE', headerColor: COLORS.success }
      );

      // Recent contributions
      const recentContributions = data.contributions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20)
        .map(contribution => {
          const member = data.members.find(m => m.id === contribution.memberId);
          return {
            date: formatDate(contribution.date, 'MMM d, yyyy'),
            member: member ? member.name : 'Unknown Member',
            type: contribution.type === 'monetary' ? 'Monetary' : 'In-Kind',
            amount: contribution.amount ? formatUGX(contribution.amount) : 'N/A',
            description: contribution.description,
            method: contribution.paymentMethod || 'N/A'
          };
        });

      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 22 },
          { header: 'Member Name', dataKey: 'member', width: 35 },
          { header: 'Type', dataKey: 'type', width: 20 },
          { header: 'Amount', dataKey: 'amount', width: 25 },
          { header: 'Description', dataKey: 'description', width: 40 },
          { header: 'Payment Method', dataKey: 'method', width: 25 },
        ],
        recentContributions,
        { title: 'RECENT CONTRIBUTIONS RECORD', headerColor: COLORS.success }
      );
    }

    // Expense analysis
    if (data.expenses.length > 0) {
      const expensesByCategory = data.expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const expenseCategoryData = Object.entries(expensesByCategory)
        .sort(([,a], [,b]) => b - a)
        .map(([category, amount]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1).replace(/[_-]/g, ' '),
          amount: formatUGX(amount),
          count: data.expenses.filter(e => e.category === category).length.toString(),
          percentage: `${Math.round((amount / data.totalExpenses) * 100)}%`,
          average: formatUGX(amount / data.expenses.filter(e => e.category === category).length)
        }));

      this.addTable(
        [
          { header: 'Expense Category', dataKey: 'category', width: 40 },
          { header: 'Total Amount', dataKey: 'amount', width: 30 },
          { header: 'Count', dataKey: 'count', width: 20 },
          { header: 'Percentage', dataKey: 'percentage', width: 25 },
          { header: 'Average', dataKey: 'average', width: 25 },
        ],
        expenseCategoryData,
        { title: 'EXPENSES ANALYSIS BY CATEGORY', headerColor: COLORS.danger }
      );

      // Recent expenses
      const recentExpenses = data.expenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20)
        .map(expense => ({
          date: formatDate(expense.date, 'MMM d, yyyy'),
          category: expense.category.charAt(0).toUpperCase() + expense.category.slice(1).replace(/[_-]/g, ' '),
          amount: formatUGX(expense.amount),
          description: expense.description,
          method: expense.paymentMethod || 'N/A',
          receipt: expense.receipt || 'No receipt'
        }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 22 },
          { header: 'Category', dataKey: 'category', width: 30 },
          { header: 'Amount', dataKey: 'amount', width: 25 },
          { header: 'Description', dataKey: 'description', width: 45 },
          { header: 'Payment Method', dataKey: 'method', width: 25 },
          { header: 'Receipt', dataKey: 'receipt', width: 25 },
        ],
        recentExpenses,
        { title: 'RECENT EXPENSES RECORD', headerColor: COLORS.danger }
      );
    }

    this.save('fc256-financial-report');
  }
}

/**
 * Events PDF Export
 */
export class EventsPDFExporter extends BasePDFExporter {
  exportEvents(events: Event[], type: 'training' | 'friendly' | 'all' = 'all'): void {
    const filteredEvents = type === 'all' ? events : events.filter(e => e.type === type);
    const title = type === 'all' ? 'EVENTS CALENDAR' : type === 'training' ? 'TRAINING SCHEDULE' : 'FRIENDLY MATCHES';
    
    this.addHeader(title, `Complete schedule with ${filteredEvents.length} events`);

    // Event statistics
    const upcomingEvents = filteredEvents.filter(e => new Date(e.date) > new Date()).length;
    const pastEvents = filteredEvents.filter(e => new Date(e.date) <= new Date()).length;
    const trainingCount = filteredEvents.filter(e => e.type === 'training').length;
    const friendlyCount = filteredEvents.filter(e => e.type === 'friendly').length;

    const statsData = [
      { 
        label: 'Total Events', 
        value: filteredEvents.length.toString(),
        color: COLORS.primary,
      },
      { 
        label: 'Upcoming', 
        value: upcomingEvents.toString(),
        color: COLORS.success,
      },
      { 
        label: 'Completed', 
        value: pastEvents.toString(),
        color: COLORS.info,
      },
    ];

    if (type === 'all') {
      statsData.push({ 
        label: 'Training Sessions', 
        value: trainingCount.toString(),
        color: COLORS.warning,
      });
    }

    this.addStatsSection(statsData);

    // Monthly breakdown
    const monthlyBreakdown = filteredEvents.reduce((acc, event) => {
      const month = new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyData = Object.entries(monthlyBreakdown)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, count]) => ({
        month: month,
        events: count.toString(),
        training: filteredEvents.filter(e => e.type === 'training' && new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) === month).length.toString(),
        friendlies: filteredEvents.filter(e => e.type === 'friendly' && new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) === month).length.toString(),
        status: count >= 4 ? 'Active' : count >= 2 ? 'Moderate' : 'Light'
      }));

    this.addTable(
      [
        { header: 'Month', dataKey: 'month', width: 35 },
        { header: 'Total Events', dataKey: 'events', width: 25 },
        { header: 'Training', dataKey: 'training', width: 25 },
        { header: 'Friendlies', dataKey: 'friendlies', width: 25 },
        { header: 'Activity Level', dataKey: 'status', width: 25 },
      ],
      monthlyData,
      { title: 'MONTHLY EVENTS BREAKDOWN', headerColor: COLORS.info }
    );

    // Complete events list
    const eventRows = filteredEvents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(event => ({
        date: formatDate(event.date, 'MMM d, yyyy'),
        time: event.time,
        type: event.type === 'training' ? 'Training Session' : 'Friendly Match',
        description: event.type === 'training' ? (event.description || 'Training Session') : `vs ${event.opponent}`,
        location: event.location,
        status: new Date(event.date) > new Date() ? 'Upcoming' : 'Completed',
        notes: event.description || 'No additional notes'
      }));

    this.addTable(
      [
        { header: 'Date', dataKey: 'date', width: 25 },
        { header: 'Time', dataKey: 'time', width: 20 },
        { header: 'Event Type', dataKey: 'type', width: 30 },
        { header: 'Details', dataKey: 'description', width: 40 },
        { header: 'Location', dataKey: 'location', width: 30 },
        { header: 'Status', dataKey: 'status', width: 25 },
      ],
      eventRows,
      { title: 'COMPLETE EVENTS SCHEDULE', headerColor: COLORS.primary }
    );

    this.save(`fc256-${type === 'all' ? 'events' : type}`);
  }
}

/**
 * Attendance PDF Export
 */
export class AttendancePDFExporter extends BasePDFExporter {
  exportAttendance(data: {
    attendanceRecords: { member: Member; event: Event; attendance: Attendance }[];
    stats: {
      totalSessions: number;
      averageAttendance: number;
      highestAttendance: number;
      lowestAttendance: number;
    };
  }): void {
    this.addHeader(
      'ATTENDANCE REPORT', 
      `Comprehensive attendance analysis with ${data.attendanceRecords.length} records`
    );

    // Attendance statistics
    this.addStatsSection([
      { 
        label: 'Total Sessions', 
        value: data.stats.totalSessions.toString(),
        color: COLORS.primary,
      },
      { 
        label: 'Average Attendance', 
        value: data.stats.averageAttendance.toString(),
        color: COLORS.success,
      },
      { 
        label: 'Best Session', 
        value: data.stats.highestAttendance.toString(),
        color: COLORS.warning,
      },
      { 
        label: 'Lowest Session', 
        value: data.stats.lowestAttendance.toString(),
        color: COLORS.info,
      },
    ]);

    // Attendance by status
    const statusCounts = data.attendanceRecords.reduce((acc, record) => {
      acc[record.attendance.status] = (acc[record.attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count: count.toString(),
        percentage: `${Math.round((count / data.attendanceRecords.length) * 100)}%`,
        description: this.getStatusDescription(status)
      }));

    this.addTable(
      [
        { header: 'Attendance Status', dataKey: 'status', width: 30 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
        { header: 'Description', dataKey: 'description', width: 40 },
      ],
      statusData,
      { title: 'ATTENDANCE BY STATUS', headerColor: COLORS.success }
    );

    // Detailed attendance records
    const attendanceRows = data.attendanceRecords
      .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
      .slice(0, 50)
      .map(record => ({
        date: formatDate(record.event.date, 'MMM d, yyyy'),
        event: record.event.type === 'training' ? 'Training Session' : `Friendly vs ${record.event.opponent}`,
        member: record.member.name,
        jersey: `#${record.member.jerseyNumber}`,
        position: record.member.position,
        status: record.attendance.status.charAt(0).toUpperCase() + record.attendance.status.slice(1),
        notes: record.attendance.notes || 'No notes',
      }));

    this.addTable(
      [
        { header: 'Date', dataKey: 'date', width: 22 },
        { header: 'Event', dataKey: 'event', width: 30 },
        { header: 'Member', dataKey: 'member', width: 30 },
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Position', dataKey: 'position', width: 25 },
        { header: 'Status', dataKey: 'status', width: 20 },
        { header: 'Notes', dataKey: 'notes', width: 35 },
      ],
      attendanceRows,
      { title: 'DETAILED ATTENDANCE RECORDS', headerColor: COLORS.primary }
    );

    this.save('fc256-attendance');
  }

  private getStatusDescription(status: string): string {
    switch (status) {
      case 'present': return 'Member attended the session';
      case 'absent': return 'Member did not attend';
      case 'late': return 'Member arrived late';
      case 'excused': return 'Absence was excused';
      default: return 'Status not specified';
    }
  }
}

/**
 * Leadership PDF Export
 */
export class LeadershipPDFExporter extends BasePDFExporter {
  exportLeadership(data: { leadership: Leadership[]; members: Member[] }): void {
    this.addHeader(
      'LEADERSHIP STRUCTURE', 
      `Organizational chart with ${data.leadership.length} leadership positions`
    );

    // Leadership statistics
    const activeRoles = data.leadership.filter(l => l.isActive).length;
    const inactiveRoles = data.leadership.filter(l => !l.isActive).length;
    const uniqueLeaders = new Set(data.leadership.map(l => l.memberId)).size;

    this.addStatsSection([
      { 
        label: 'Total Positions', 
        value: data.leadership.length.toString(),
        color: COLORS.primary,
      },
      { 
        label: 'Active Roles', 
        value: activeRoles.toString(),
        color: COLORS.success,
      },
      { 
        label: 'Inactive Roles', 
        value: inactiveRoles.toString(),
        color: COLORS.warning,
      },
      { 
        label: 'Unique Leaders', 
        value: uniqueLeaders.toString(),
        color: COLORS.info,
      },
    ]);

    // Leadership by category
    const getRoleCategory = (role: string): string => {
      const technicalStaff = ['Head Coach', 'Assistant Coach', 'Goalkeeping Coach', 'Fitness Trainer', 'Physiotherapist', 'Team Doctor', 'Nutritionist'];
      const teamLeadership = ['Captain', 'Vice Captain', 'Team Leader'];
      const administrative = ['Chairman', 'Vice Chairman', 'Team Manager', 'Secretary', 'Treasurer', 'Public Relations Officer', 'Media Officer'];
      const equipment = ['Equipment Manager', 'Kit Manager', 'Transport Coordinator', 'Groundskeeper'];
      
      if (technicalStaff.includes(role)) return 'Technical Staff';
      if (teamLeadership.includes(role)) return 'Team Leadership';
      if (administrative.includes(role)) return 'Administrative';
      if (equipment.includes(role)) return 'Equipment & Logistics';
      return 'Other Roles';
    };

    const categoryBreakdown = data.leadership.reduce((acc, leadership) => {
      const category = getRoleCategory(leadership.role);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({
        category: category,
        count: count.toString(),
        percentage: `${Math.round((count / data.leadership.length) * 100)}%`,
        status: count >= 3 ? 'Well Staffed' : count >= 2 ? 'Adequate' : 'Needs Attention'
      }));

    this.addTable(
      [
        { header: 'Leadership Category', dataKey: 'category', width: 40 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
        { header: 'Staffing Status', dataKey: 'status', width: 30 },
      ],
      categoryData,
      { title: 'LEADERSHIP ROLES BY CATEGORY', headerColor: COLORS.warning }
    );

    // Complete leadership roster
    const leadershipRows = data.leadership
      .sort((a, b) => a.role.localeCompare(b.role))
      .map(leadership => {
        const member = data.members.find(m => m.id === leadership.memberId);
        return {
          member: member ? member.name : 'Unknown Member',
          jersey: member ? `#${member.jerseyNumber}` : 'N/A',
          role: leadership.role,
          category: getRoleCategory(leadership.role),
          startDate: formatDate(leadership.startDate, 'MMM d, yyyy'),
          status: leadership.isActive ? 'Active' : 'Inactive',
          duration: this.calculateDuration(leadership.startDate)
        };
      });

    this.addTable(
      [
        { header: 'Member Name', dataKey: 'member', width: 35 },
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Leadership Role', dataKey: 'role', width:  40 },
        { header: 'Category', dataKey: 'category', width: 30 },
        { header: 'Start Date', dataKey: 'startDate', width: 25 },
        { header: 'Status', dataKey: 'status', width: 20 },
        { header: 'Duration', dataKey: 'duration', width: 25 },
      ],
      leadershipRows,
      { title: 'COMPLETE LEADERSHIP DIRECTORY', headerColor: COLORS.primary }
    );

    this.save('fc256-leadership');
  }

  private calculateDuration(startDate: string): string {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  }
}