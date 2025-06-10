import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendance, Contribution, Event, Member, Expense, Leadership } from '../types';
import { formatDate } from './date-utils';
import { formatUGX } from './currency-utils';

// Formal PDF styling with beautiful gradients (no emojis)
const COLORS = {
  primary: '#4f4fe6',
  yellow: '#eab308',
  secondary: '#f43f4e',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  gray: '#6b7280',
  lightGray: '#f8fafc',
  darkGray: '#374151',
  white: '#ffffff',
  black: '#000000',
};

const FONTS = {
  title: 18,
  subtitle: 14,
  heading: 12,
  body: 10,
  small: 8,
  tiny: 7,
};

/**
 * Formal PDF export class with professional styling and gradients
 */
class BasePDFExporter {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number = 20;
  protected currentY: number = 20;

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF(orientation, 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Add formal header with Fitholics FC branding
   */
  protected addHeader(title: string, subtitle?: string): void {
    // Header background with gradient effect
    this.addGradientBackground(0, 0, this.pageWidth, 50, COLORS.primary, COLORS.yellow);
    
    // Team name with professional typography
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FITHOLICS FC', this.margin, this.margin + 12);
    
    // Core values
    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Excellence • Discipline • Teamwork', this.margin, this.margin + 20);
    
    // Manager contact (right side)
    const contactX = this.pageWidth - 70;
    
    // Contact background
    this.doc.setFillColor(255, 255, 255, 0.95);
    this.doc.roundedRect(contactX, this.margin + 5, 65, 25, 2, 2, 'F');
    
    // Contact details
    this.doc.setFontSize(FONTS.tiny);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Team Manager', contactX + 3, this.margin + 10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Pius Paul', contactX + 3, this.margin + 14);
    this.doc.text('piuspaul392@gmail.com', contactX + 3, this.margin + 18);
    this.doc.text('+256 700 654 321', contactX + 3, this.margin + 22);
    
    // Professional separator line
    this.doc.setDrawColor(COLORS.yellow);
    this.doc.setLineWidth(2);
    this.doc.line(this.margin, 55, this.pageWidth - this.margin, 55);
    
    // Report title
    this.doc.setFontSize(FONTS.subtitle);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, 70);
    
    if (subtitle) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, 78);
    }
    
    this.currentY = 90;
  }

  /**
   * Add gradient background
   */
  protected addGradientBackground(x: number, y: number, width: number, height: number, startColor: string, endColor: string): void {
    const steps = 15;
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
   * Add professional statistics cards
   */
  protected addStatsSection(stats: { label: string; value: string; color?: string }[]): void {
    const cardWidth = (this.pageWidth - this.margin * 2 - 10 * (stats.length - 1)) / stats.length;
    const cardHeight = 30;

    stats.forEach((stat, index) => {
      const x = this.margin + index * (cardWidth + 10);
      
      // Card shadow
      this.doc.setFillColor(0, 0, 0, 0.1);
      this.doc.roundedRect(x + 1, this.currentY + 1, cardWidth, cardHeight, 3, 3, 'F');
      
      // Card background
      const cardColor = stat.color || COLORS.primary;
      this.addGradientBackground(x, this.currentY, cardWidth, cardHeight, cardColor, this.lightenColor(cardColor, 0.2));
      
      // Card border
      this.doc.setDrawColor(cardColor);
      this.doc.setLineWidth(1);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 3, 3, 'S');
      
      // Label
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(stat.label, x + cardWidth / 2, this.currentY + 10, { align: 'center' });
      
      // Value
      this.doc.setFontSize(FONTS.heading);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(stat.value, x + cardWidth / 2, this.currentY + 22, { align: 'center' });
    });

    this.currentY += cardHeight + 20;
  }

  /**
   * Lighten a color
   */
  protected lightenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.round(255 * amount));
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.round(255 * amount));
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.round(255 * amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Add professional section heading
   */
  protected addSectionHeading(title: string, color: string = COLORS.primary): void {
    this.checkPageBreak(20);
    
    // Background bar with gradient
    this.addGradientBackground(this.margin - 5, this.currentY - 2, this.pageWidth - this.margin * 2 + 10, 16, color, this.lightenColor(color, 0.3));
    
    // Title text
    this.doc.setFontSize(FONTS.heading);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY + 8);
    
    this.currentY += 25;
  }

  /**
   * Add professional table
   */
  protected addTable(
    columns: { header: string; dataKey: string; width?: number }[],
    rows: any[],
    options: { title?: string; headerColor?: string } = {}
  ): void {
    this.checkPageBreak(50);

    if (options.title) {
      this.addSectionHeading(options.title, options.headerColor);
    }

    const headerColor = options.headerColor || COLORS.primary;

    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey] || '')),
      startY: this.currentY,
      styles: { 
        fontSize: FONTS.body, 
        cellPadding: 3,
        textColor: COLORS.darkGray,
        lineColor: COLORS.lightGray,
        lineWidth: 0.3,
      },
      headStyles: { 
        fillColor: headerColor,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: FONTS.body,
        cellPadding: 5,
      },
      alternateRowStyles: { 
        fillColor: '#fafafa'
      },
      columnStyles: columns.reduce((acc, col, index) => {
        if (col.width) {
          acc[index] = { cellWidth: col.width };
        }
        return acc;
      }, {} as any),
      margin: { left: this.margin, right: this.margin },
      theme: 'grid',
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
  }

  /**
   * Add professional footer
   */
  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      const footerY = this.pageHeight - 20;
      
      // Footer line
      this.doc.setDrawColor(COLORS.yellow);
      this.doc.setLineWidth(1);
      this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5);

      // Page number
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        footerY,
        { align: 'right' }
      );

      // Generation info
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Generated: ${formatDate(new Date().toISOString(), 'MMM d, yyyy')} at ${new Date().toLocaleTimeString()}`,
        this.margin,
        footerY
      );

      // Confidentiality notice
      this.doc.setFontSize(FONTS.tiny);
      this.doc.setTextColor(COLORS.gray);
      this.doc.text(
        'Confidential - Fitholics FC Internal Report',
        this.pageWidth / 2,
        footerY + 6,
        { align: 'center' }
      );
    }
  }

  /**
   * Check if we need a new page
   */
  protected checkPageBreak(requiredHeight: number = 30): void {
    if (this.currentY + requiredHeight > this.pageHeight - 35) {
      this.doc.addPage();
      this.currentY = this.margin + 15;
    }
  }

  /**
   * Save the PDF
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
    const dateRangeText = data.dateRange 
      ? `${formatDate(data.dateRange.startDate)} to ${formatDate(data.dateRange.endDate)}`
      : formatDate(new Date().toISOString());
      
    this.addHeader(
      'DASHBOARD OVERVIEW', 
      `Team Performance Report - ${dateRangeText}`
    );

    // Team statistics
    this.addStatsSection([
      { 
        label: 'Active Members', 
        value: data.stats.activeMembers.toString(),
        color: COLORS.success,
      },
      { 
        label: 'Training Sessions', 
        value: data.stats.trainingSessionsThisMonth.toString(),
        color: COLORS.info,
      },
      { 
        label: 'Friendly Matches', 
        value: data.stats.friendliesThisMonth.toString(),
        color: COLORS.warning,
      },
      { 
        label: 'Team Balance', 
        value: formatUGX(data.stats.remainingBalance),
        color: data.stats.remainingBalance >= 0 ? COLORS.success : COLORS.danger,
      },
    ]);

    // Financial Summary
    this.addSectionHeading('FINANCIAL SUMMARY', COLORS.success);
    
    const financialData = [
      { 
        metric: 'Total Contributions', 
        amount: formatUGX(data.stats.totalContributions),
        status: 'Income'
      },
      { 
        metric: 'Total Expenses', 
        amount: formatUGX(data.stats.totalExpenses),
        status: 'Outgoing'
      },
      { 
        metric: data.stats.remainingBalance >= 0 ? 'Available Balance' : 'Deficit', 
        amount: formatUGX(Math.abs(data.stats.remainingBalance)),
        status: data.stats.remainingBalance >= 0 ? 'Positive' : 'Negative'
      },
    ];

    this.addTable(
      [
        { header: 'Financial Metric', dataKey: 'metric', width: 60 },
        { header: 'Amount (UGX)', dataKey: 'amount', width: 40 },
        { header: 'Status', dataKey: 'status', width: 30 },
      ],
      financialData,
      { headerColor: COLORS.success }
    );

    // Upcoming Events
    if (data.upcomingEvents.length > 0) {
      const eventRows = data.upcomingEvents.slice(0, 6).map(event => ({
        date: formatDate(event.date, 'MMM d'),
        type: event.type === 'training' ? 'Training' : `vs ${event.opponent}`,
        time: event.time,
        location: event.location,
        status: 'Upcoming',
      }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 25 },
          { header: 'Event', dataKey: 'type', width: 50 },
          { header: 'Time', dataKey: 'time', width: 20 },
          { header: 'Location', dataKey: 'location', width: 40 },
          { header: 'Status', dataKey: 'status', width: 25 },
        ],
        eventRows,
        { title: 'UPCOMING EVENTS', headerColor: COLORS.info }
      );
    }

    // Recent Transactions
    if (data.recentTransactions.length > 0) {
      const transactionRows = data.recentTransactions.slice(0, 10).map(transaction => ({
        date: formatDate(transaction.date, 'MMM d'),
        type: transaction.type === 'contribution' ? 'Income' : 'Expense',
        description: transaction.description,
        amount: `${transaction.type === 'contribution' ? '+' : '-'}${formatUGX(transaction.amount)}`,
        status: transaction.type === 'contribution' ? 'Credit' : 'Debit',
      }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 20 },
          { header: 'Type', dataKey: 'type', width: 25 },
          { header: 'Description', dataKey: 'description', width: 60 },
          { header: 'Amount', dataKey: 'amount', width: 30 },
          { header: 'Status', dataKey: 'status', width: 25 },
        ],
        transactionRows,
        { title: 'RECENT TRANSACTIONS', headerColor: COLORS.warning }
      );
    }

    // Attendance Trends if available
    if (data.attendanceTrends && data.attendanceTrends.length > 0) {
      const attendanceRows = data.attendanceTrends.slice(0, 8).map(trend => ({
        date: formatDate(trend.date, 'MMM d'),
        session: trend.type === 'training' ? 'Training' : `vs ${trend.opponent}`,
        present: trend.presentCount.toString(),
        total: trend.totalMembers.toString(),
        rate: `${Math.round(trend.attendanceRate)}%`,
      }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 20 },
          { header: 'Session', dataKey: 'session', width: 40 },
          { header: 'Present', dataKey: 'present', width: 20 },
          { header: 'Total', dataKey: 'total', width: 20 },
          { header: 'Rate', dataKey: 'rate', width: 20 },
        ],
        attendanceRows,
        { title: 'ATTENDANCE TRENDS', headerColor: COLORS.primary }
      );
    }

    this.save('fitholics-fc-dashboard');
  }
}

/**
 * Members PDF Export
 */
export class MembersPDFExporter extends BasePDFExporter {
  exportMembers(members: Member[]): void {
    this.addHeader(
      'TEAM MEMBERS DIRECTORY', 
      `Complete roster with ${members.length} registered members`
    );

    // Member statistics
    const activeMembers = members.filter(m => m.status === 'active').length;
    const inactiveMembers = members.filter(m => m.status === 'inactive').length;
    const injuredMembers = members.filter(m => m.status === 'injured').length;

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
        label: 'Injured', 
        value: injuredMembers.toString(),
        color: COLORS.danger,
      },
    ]);

    // Position breakdown
    const positionCounts = members.reduce((acc, member) => {
      acc[member.position] = (acc[member.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const positionData = Object.entries(positionCounts).map(([position, count]) => ({
      position: position,
      count: count.toString(),
      percentage: `${Math.round((count / members.length) * 100)}%`,
    }));

    this.addTable(
      [
        { header: 'Position', dataKey: 'position', width: 50 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
      ],
      positionData,
      { title: 'SQUAD COMPOSITION', headerColor: COLORS.info }
    );

    // Complete member roster
    const memberRows = members
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
      .map(member => ({
        jersey: `#${member.jerseyNumber}`,
        name: member.name,
        position: member.position,
        status: member.status.charAt(0).toUpperCase() + member.status.slice(1),
        email: member.email,
        phone: member.phone,
        joined: formatDate(member.dateJoined, 'MMM yyyy'),
      }));

    this.addTable(
      [
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Name', dataKey: 'name', width: 40 },
        { header: 'Position', dataKey: 'position', width: 30 },
        { header: 'Status', dataKey: 'status', width: 25 },
        { header: 'Email', dataKey: 'email', width: 50 },
        { header: 'Phone', dataKey: 'phone', width: 30 },
        { header: 'Joined', dataKey: 'joined', width: 20 },
      ],
      memberRows,
      { title: 'COMPLETE TEAM ROSTER', headerColor: COLORS.primary }
    );

    this.save('fitholics-fc-members');
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
        label: 'Transactions', 
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
        type: type === 'monetary' ? 'Monetary' : 'In-Kind',
        amount: formatUGX(amount),
        count: data.contributions.filter(c => c.type === type).length.toString(),
        percentage: `${Math.round((amount / data.totalContributions) * 100)}%`,
      }));

      this.addTable(
        [
          { header: 'Type', dataKey: 'type', width: 30 },
          { header: 'Total Amount', dataKey: 'amount', width: 35 },
          { header: 'Count', dataKey: 'count', width: 20 },
          { header: 'Percentage', dataKey: 'percentage', width: 25 },
        ],
        contributionTypeData,
        { title: 'CONTRIBUTIONS BY TYPE', headerColor: COLORS.success }
      );

      // Recent contributions
      const recentContributions = data.contributions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
        .map(contribution => {
          const member = data.members.find(m => m.id === contribution.memberId);
          return {
            date: formatDate(contribution.date, 'MMM d'),
            member: member ? member.name : 'Unknown',
            type: contribution.type === 'monetary' ? 'Money' : 'In-Kind',
            amount: contribution.amount ? formatUGX(contribution.amount) : 'N/A',
            description: contribution.description,
          };
        });

      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 20 },
          { header: 'Member', dataKey: 'member', width: 40 },
          { header: 'Type', dataKey: 'type', width: 25 },
          { header: 'Amount', dataKey: 'amount', width: 30 },
          { header: 'Description', dataKey: 'description', width: 50 },
        ],
        recentContributions,
        { title: 'RECENT CONTRIBUTIONS', headerColor: COLORS.success }
      );
    }

    // Expense analysis
    if (data.expenses.length > 0) {
      const expensesByCategory = data.expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const expenseCategoryData = Object.entries(expensesByCategory).map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount: formatUGX(amount),
        count: data.expenses.filter(e => e.category === category).length.toString(),
        percentage: `${Math.round((amount / data.totalExpenses) * 100)}%`,
      }));

      this.addTable(
        [
          { header: 'Category', dataKey: 'category', width: 40 },
          { header: 'Total Amount', dataKey: 'amount', width: 35 },
          { header: 'Count', dataKey: 'count', width: 20 },
          { header: 'Percentage', dataKey: 'percentage', width: 25 },
        ],
        expenseCategoryData,
        { title: 'EXPENSES BY CATEGORY', headerColor: COLORS.danger }
      );

      // Recent expenses
      const recentExpenses = data.expenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
        .map(expense => ({
          date: formatDate(expense.date, 'MMM d'),
          category: expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
          amount: formatUGX(expense.amount),
          description: expense.description,
        }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date', width: 20 },
          { header: 'Category', dataKey: 'category', width: 35 },
          { header: 'Amount', dataKey: 'amount', width: 30 },
          { header: 'Description', dataKey: 'description', width: 60 },
        ],
        recentExpenses,
        { title: 'RECENT EXPENSES', headerColor: COLORS.danger }
      );
    }

    this.save('fitholics-fc-financial-report');
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
        label: 'Training', 
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

    const monthlyData = Object.entries(monthlyBreakdown).map(([month, count]) => ({
      month: month,
      events: count.toString(),
      training: filteredEvents.filter(e => e.type === 'training' && new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) === month).length.toString(),
      friendlies: filteredEvents.filter(e => e.type === 'friendly' && new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) === month).length.toString(),
    }));

    this.addTable(
      [
        { header: 'Month', dataKey: 'month', width: 40 },
        { header: 'Total Events', dataKey: 'events', width: 25 },
        { header: 'Training', dataKey: 'training', width: 25 },
        { header: 'Friendlies', dataKey: 'friendlies', width: 25 },
      ],
      monthlyData,
      { title: 'EVENTS BY MONTH', headerColor: COLORS.info }
    );

    // Complete events list
    const eventRows = filteredEvents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(event => ({
        date: formatDate(event.date, 'MMM d'),
        time: event.time,
        type: event.type === 'training' ? 'Training' : 'Friendly',
        description: event.type === 'training' ? (event.description || 'Training Session') : `vs ${event.opponent}`,
        location: event.location,
        status: new Date(event.date) > new Date() ? 'Upcoming' : 'Completed',
      }));

    this.addTable(
      [
        { header: 'Date', dataKey: 'date', width: 20 },
        { header: 'Time', dataKey: 'time', width: 25 },
        { header: 'Type', dataKey: 'type', width: 25 },
        { header: 'Event Details', dataKey: 'description', width: 50 },
        { header: 'Location', dataKey: 'location', width: 40 },
        { header: 'Status', dataKey: 'status', width: 25 },
      ],
      eventRows,
      { title: 'COMPLETE SCHEDULE', headerColor: COLORS.primary }
    );

    this.save(`fitholics-fc-${type === 'all' ? 'events' : type}`);
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
        label: 'Best Attendance', 
        value: data.stats.highestAttendance.toString(),
        color: COLORS.warning,
      },
      { 
        label: 'Lowest Attendance', 
        value: data.stats.lowestAttendance.toString(),
        color: COLORS.info,
      },
    ]);

    // Attendance by status
    const statusCounts = data.attendanceRecords.reduce((acc, record) => {
      acc[record.attendance.status] = (acc[record.attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count: count.toString(),
      percentage: `${Math.round((count / data.attendanceRecords.length) * 100)}%`,
    }));

    this.addTable(
      [
        { header: 'Status', dataKey: 'status', width: 30 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
      ],
      statusData,
      { title: 'ATTENDANCE BY STATUS', headerColor: COLORS.success }
    );

    // Detailed attendance records
    const attendanceRows = data.attendanceRecords
      .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
      .slice(0, 50)
      .map(record => ({
        date: formatDate(record.event.date, 'MMM d'),
        event: record.event.type === 'training' ? 'Training' : `vs ${record.event.opponent}`,
        member: record.member.name,
        jersey: `#${record.member.jerseyNumber}`,
        status: record.attendance.status.charAt(0).toUpperCase() + record.attendance.status.slice(1),
        notes: record.attendance.notes || 'No notes',
      }));

    this.addTable(
      [
        { header: 'Date', dataKey: 'date', width: 20 },
        { header: 'Event', dataKey: 'event', width: 35 },
        { header: 'Member', dataKey: 'member', width: 40 },
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Status', dataKey: 'status', width: 25 },
        { header: 'Notes', dataKey: 'notes', width: 40 },
      ],
      attendanceRows,
      { title: 'RECENT ATTENDANCE RECORDS', headerColor: COLORS.primary }
    );

    this.save('fitholics-fc-attendance');
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
        label: 'Leaders', 
        value: uniqueLeaders.toString(),
        color: COLORS.info,
      },
    ]);

    // Leadership by category
    const getRoleCategory = (role: string): string => {
      const technicalStaff = ['Head Coach', 'Assistant Coach', 'Goalkeeping Coach', 'Fitness Trainer', 'Physiotherapist', 'Team Doctor', 'Nutritionist'];
      const teamLeadership = ['Captain', 'Vice Captain', 'Team Leader'];
      const administrative = ['Chairman', 'Vice Chairman', 'Team Manager', 'Secretary', 'Treasurer', 'Public Relations Officer', 'Media Officer'];
      
      if (technicalStaff.includes(role)) return 'Technical Staff';
      if (teamLeadership.includes(role)) return 'Team Leadership';
      if (administrative.includes(role)) return 'Administrative';
      return 'Other';
    };

    const categoryBreakdown = data.leadership.reduce((acc, leadership) => {
      const category = getRoleCategory(leadership.role);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryBreakdown).map(([category, count]) => ({
      category: category,
      count: count.toString(),
      percentage: `${Math.round((count / data.leadership.length) * 100)}%`,
    }));

    this.addTable(
      [
        { header: 'Category', dataKey: 'category', width: 40 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
      ],
      categoryData,
      { title: 'ROLES BY CATEGORY', headerColor: COLORS.warning }
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
          startDate: formatDate(leadership.startDate, 'MMM yyyy'),
          status: leadership.isActive ? 'Active' : 'Inactive',
        };
      });

    this.addTable(
      [
        { header: 'Member', dataKey: 'member', width: 40 },
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Role', dataKey: 'role', width: 45 },
        { header: 'Category', dataKey: 'category', width: 35 },
        { header: 'Start Date', dataKey: 'startDate', width: 25 },
        { header: 'Status', dataKey: 'status', width: 25 },
      ],
      leadershipRows,
      { title: 'LEADERSHIP DIRECTORY', headerColor: COLORS.primary }
    );

    this.save('fitholics-fc-leadership');
  }
}