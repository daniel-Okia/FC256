import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendance, Contribution, Event, Member, Expense, Leadership } from '../types';
import { formatDate } from './date-utils';
import { formatUGX } from './currency-utils';

// Enhanced PDF styling with beautiful graphics
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
  gradient: {
    start: '#4f4fe6',
    middle: '#eab308',
    end: '#f43f4e'
  }
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
 * Enhanced PDF export class with beautiful graphics and branding
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
   * Add beautiful header with Fitholics FC branding and graphics
   */
  protected addHeader(title: string, subtitle?: string): void {
    // Background gradient header
    this.addGradientBackground(0, 0, this.pageWidth, 60, COLORS.primary, COLORS.yellow);
    
    // Team logo placeholder (circular background)
    this.doc.setFillColor(255, 255, 255);
    this.doc.circle(this.margin + 15, this.margin + 15, 12, 'F');
    
    // Logo border
    this.doc.setDrawColor(COLORS.yellow);
    this.doc.setLineWidth(2);
    this.doc.circle(this.margin + 15, this.margin + 15, 12, 'S');
    
    // Team name with beautiful typography
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FITHOLICS FC', this.margin + 35, this.margin + 12);
    
    // Core values with elegant styling
    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Excellence • Discipline • Teamwork', this.margin + 35, this.margin + 20);
    
    // Manager contact in elegant box (right side)
    const contactBoxX = this.pageWidth - 70;
    const contactBoxY = this.margin + 5;
    
    // Contact background
    this.doc.setFillColor(255, 255, 255, 0.9);
    this.doc.roundedRect(contactBoxX, contactBoxY, 65, 25, 3, 3, 'F');
    
    // Contact details
    this.doc.setFontSize(FONTS.tiny);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Team Manager', contactBoxX + 3, contactBoxY + 5);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Pius Paul', contactBoxX + 3, contactBoxY + 9);
    this.doc.text('piuspaul392@gmail.com', contactBoxX + 3, contactBoxY + 13);
    this.doc.text('+256 700 654 321', contactBoxX + 3, contactBoxY + 17);
    
    // Decorative line with gradient effect
    this.addGradientLine(this.margin, 65, this.pageWidth - this.margin, 65);
    
    // Report title with shadow effect
    this.addTextWithShadow(title, this.margin, 80, FONTS.subtitle, COLORS.darkGray, true);
    
    if (subtitle) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, 88);
    }
    
    this.currentY = 100;
  }

  /**
   * Add gradient background
   */
  protected addGradientBackground(x: number, y: number, width: number, height: number, startColor: string, endColor: string): void {
    // Simulate gradient with multiple rectangles
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
   * Add gradient line
   */
  protected addGradientLine(x1: number, y: number, x2: number, y2: number): void {
    this.doc.setDrawColor(COLORS.yellow);
    this.doc.setLineWidth(2);
    this.doc.line(x1, y, x2, y2);
  }

  /**
   * Add text with shadow effect
   */
  protected addTextWithShadow(text: string, x: number, y: number, fontSize: number, color: string, bold: boolean = false): void {
    // Shadow
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(200, 200, 200);
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.text(text, x + 0.5, y + 0.5);
    
    // Main text
    this.doc.setTextColor(color);
    this.doc.text(text, x, y);
  }

  /**
   * Interpolate between two colors
   */
  protected interpolateColor(color1: string, color2: string, ratio: number): string {
    // Simple color interpolation (hex to RGB)
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
   * Add beautiful statistics cards
   */
  protected addStatsSection(stats: { label: string; value: string; color?: string; icon?: string }[]): void {
    const cardWidth = (this.pageWidth - this.margin * 2 - 15 * (stats.length - 1)) / stats.length;
    const cardHeight = 35;

    stats.forEach((stat, index) => {
      const x = this.margin + index * (cardWidth + 15);
      
      // Card shadow
      this.doc.setFillColor(0, 0, 0, 0.1);
      this.doc.roundedRect(x + 1, this.currentY + 1, cardWidth, cardHeight, 5, 5, 'F');
      
      // Card background with gradient
      const cardColor = stat.color || COLORS.primary;
      this.addGradientBackground(x, this.currentY, cardWidth, cardHeight, cardColor, this.lightenColor(cardColor, 0.3));
      
      // Card border
      this.doc.setDrawColor(cardColor);
      this.doc.setLineWidth(1);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 5, 5, 'S');
      
      // Icon background circle
      if (stat.icon) {
        this.doc.setFillColor(255, 255, 255, 0.8);
        this.doc.circle(x + 12, this.currentY + 12, 8, 'F');
      }
      
      // Label
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(255, 255, 255);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(stat.label, x + cardWidth / 2, this.currentY + 8, { align: 'center' });
      
      // Value with emphasis
      this.doc.setFontSize(FONTS.heading);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(stat.value, x + cardWidth / 2, this.currentY + 22, { align: 'center' });
      
      // Decorative bottom line
      this.doc.setDrawColor(255, 255, 255, 0.5);
      this.doc.setLineWidth(2);
      this.doc.line(x + 5, this.currentY + cardHeight - 3, x + cardWidth - 5, this.currentY + cardHeight - 3);
    });

    this.currentY += cardHeight + 25;
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
   * Add beautiful section heading
   */
  protected addSectionHeading(title: string, color: string = COLORS.primary): void {
    this.checkPageBreak(25);
    
    // Background bar
    this.doc.setFillColor(color);
    this.doc.rect(this.margin - 5, this.currentY - 2, this.pageWidth - this.margin * 2 + 10, 20, 'F');
    
    // Title text
    this.doc.setFontSize(FONTS.heading);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY + 8);
    
    // Decorative elements
    this.doc.setFillColor(255, 255, 255, 0.3);
    this.doc.circle(this.pageWidth - this.margin - 10, this.currentY + 8, 3, 'F');
    this.doc.circle(this.pageWidth - this.margin - 20, this.currentY + 8, 2, 'F');
    
    this.currentY += 30;
  }

  /**
   * Add beautiful table
   */
  protected addTable(
    columns: { header: string; dataKey: string; width?: number }[],
    rows: any[],
    options: { title?: string; headerColor?: string } = {}
  ): void {
    this.checkPageBreak(60);

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
        cellPadding: 4,
        textColor: COLORS.darkGray,
        lineColor: COLORS.lightGray,
        lineWidth: 0.5,
        overflow: 'linebreak',
      },
      headStyles: { 
        fillColor: headerColor,
        textColor: '#ffffff',
        fontStyle: 'bold',
        fontSize: FONTS.body,
        cellPadding: 6,
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
      tableWidth: 'auto',
      theme: 'grid',
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
  }

  /**
   * Add beautiful footer
   */
  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      const footerY = this.pageHeight - 25;
      
      // Footer background
      this.addGradientBackground(0, footerY - 5, this.pageWidth, 30, COLORS.lightGray, COLORS.white);
      
      // Footer border
      this.doc.setDrawColor(COLORS.yellow);
      this.doc.setLineWidth(2);
      this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5);

      // Page number with style
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

      // Confidentiality notice with style
      this.doc.setFontSize(FONTS.tiny);
      this.doc.setTextColor(COLORS.gray);
      this.doc.text(
        'Confidential - Fitholics FC Internal Report',
        this.pageWidth / 2,
        footerY + 8,
        { align: 'center' }
      );
      
      // Decorative footer elements
      this.doc.setFillColor(COLORS.yellow);
      this.doc.circle(this.margin + 5, footerY + 8, 1, 'F');
      this.doc.circle(this.pageWidth - this.margin - 5, footerY + 8, 1, 'F');
    }
  }

  /**
   * Check if we need a new page
   */
  protected checkPageBreak(requiredHeight: number = 40): void {
    if (this.currentY + requiredHeight > this.pageHeight - 40) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
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
 * Enhanced Dashboard PDF Export with Date Filtering
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
    dateRange?: { startDate: string; endDate: string };
  }): void {
    const dateRangeText = data.dateRange 
      ? `${formatDate(data.dateRange.startDate)} to ${formatDate(data.dateRange.endDate)}`
      : formatDate(new Date().toISOString());
      
    this.addHeader(
      'DASHBOARD OVERVIEW', 
      `Team Performance Report • ${dateRangeText}`
    );

    // Enhanced team statistics with icons
    this.addStatsSection([
      { 
        label: 'Active Members', 
        value: data.stats.activeMembers.toString(),
        color: COLORS.success,
        icon: '👥'
      },
      { 
        label: 'Training Sessions', 
        value: data.stats.trainingSessionsThisMonth.toString(),
        color: COLORS.info,
        icon: '🏃'
      },
      { 
        label: 'Friendly Matches', 
        value: data.stats.friendliesThisMonth.toString(),
        color: COLORS.warning,
        icon: '⚽'
      },
      { 
        label: 'Team Balance', 
        value: formatUGX(data.stats.remainingBalance),
        color: data.stats.remainingBalance >= 0 ? COLORS.success : COLORS.danger,
        icon: '💰'
      },
    ]);

    // Financial Summary with beautiful presentation
    this.addSectionHeading('💰 FINANCIAL SUMMARY', COLORS.success);
    
    const financialData = [
      { 
        metric: '💵 Total Contributions', 
        amount: formatUGX(data.stats.totalContributions),
        status: 'Income'
      },
      { 
        metric: '💸 Total Expenses', 
        amount: formatUGX(data.stats.totalExpenses),
        status: 'Outgoing'
      },
      { 
        metric: data.stats.remainingBalance >= 0 ? '💎 Available Balance' : '⚠️ Deficit', 
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

    // Upcoming Events with enhanced styling
    if (data.upcomingEvents.length > 0) {
      const eventRows = data.upcomingEvents.slice(0, 6).map(event => ({
        date: formatDate(event.date, 'MMM d'),
        type: event.type === 'training' ? '🏃 Training' : `⚽ vs ${event.opponent}`,
        time: event.time,
        location: event.location,
        status: '📅 Upcoming',
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
        { title: '📅 UPCOMING EVENTS', headerColor: COLORS.info }
      );
    }

    // Recent Transactions with visual indicators
    if (data.recentTransactions.length > 0) {
      const transactionRows = data.recentTransactions.slice(0, 10).map(transaction => ({
        date: formatDate(transaction.date, 'MMM d'),
        type: transaction.type === 'contribution' ? '💰 Income' : '💸 Expense',
        description: transaction.description,
        amount: `${transaction.type === 'contribution' ? '+' : '-'}${formatUGX(transaction.amount)}`,
        status: transaction.type === 'contribution' ? '✅ Credit' : '❌ Debit',
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
        { title: '💳 RECENT TRANSACTIONS', headerColor: COLORS.warning }
      );
    }

    this.save('fitholics-fc-dashboard');
  }
}

/**
 * Enhanced Members PDF Export
 */
export class MembersPDFExporter extends BasePDFExporter {
  exportMembers(members: Member[]): void {
    this.addHeader(
      'TEAM MEMBERS DIRECTORY', 
      `Complete roster with ${members.length} registered members`
    );

    // Enhanced member statistics
    const activeMembers = members.filter(m => m.status === 'active').length;
    const inactiveMembers = members.filter(m => m.status === 'inactive').length;
    const injuredMembers = members.filter(m => m.status === 'injured').length;

    this.addStatsSection([
      { 
        label: 'Total Members', 
        value: members.length.toString(),
        color: COLORS.primary,
        icon: '👥'
      },
      { 
        label: 'Active Players', 
        value: activeMembers.toString(),
        color: COLORS.success,
        icon: '✅'
      },
      { 
        label: 'Inactive', 
        value: inactiveMembers.toString(),
        color: COLORS.warning,
        icon: '⏸️'
      },
      { 
        label: 'Injured', 
        value: injuredMembers.toString(),
        color: COLORS.danger,
        icon: '🏥'
      },
    ]);

    // Position breakdown with visual elements
    const positionCounts = members.reduce((acc, member) => {
      acc[member.position] = (acc[member.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const positionIcons: Record<string, string> = {
      'Goalkeeper': '🥅',
      'Defender': '🛡️',
      'Midfielder': '⚡',
      'Forward': '🎯',
      'Coach': '👨‍🏫',
      'Manager': '👔'
    };

    const positionData = Object.entries(positionCounts).map(([position, count]) => ({
      position: `${positionIcons[position] || '⚽'} ${position}`,
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
      { title: '⚽ SQUAD COMPOSITION', headerColor: COLORS.info }
    );

    // Complete member roster with enhanced formatting
    const memberRows = members
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
      .map(member => {
        const statusIcons: Record<string, string> = {
          'active': '✅',
          'inactive': '⏸️',
          'injured': '🏥',
          'suspended': '🚫'
        };
        
        return {
          jersey: `#${member.jerseyNumber}`,
          name: member.name,
          position: `${positionIcons[member.position] || '⚽'} ${member.position}`,
          status: `${statusIcons[member.status] || '❓'} ${member.status.charAt(0).toUpperCase() + member.status.slice(1)}`,
          email: member.email,
          phone: member.phone,
          joined: formatDate(member.dateJoined, 'MMM yyyy'),
        };
      });

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
      { title: '👥 COMPLETE TEAM ROSTER', headerColor: COLORS.primary }
    );

    this.save('fitholics-fc-members');
  }
}

/**
 * Enhanced Contributions & Expenses PDF Export
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
      `Contributions & Expenses Analysis • ${formatDate(new Date().toISOString())}`
    );

    // Enhanced financial overview
    this.addStatsSection([
      { 
        label: 'Total Income', 
        value: formatUGX(data.totalContributions),
        color: COLORS.success,
        icon: '💰'
      },
      { 
        label: 'Total Expenses', 
        value: formatUGX(data.totalExpenses),
        color: COLORS.danger,
        icon: '💸'
      },
      { 
        label: data.remainingBalance >= 0 ? 'Net Balance' : 'Deficit', 
        value: formatUGX(Math.abs(data.remainingBalance)),
        color: data.remainingBalance >= 0 ? COLORS.success : COLORS.warning,
        icon: data.remainingBalance >= 0 ? '💎' : '⚠️'
      },
      { 
        label: 'Transactions', 
        value: (data.contributions.length + data.expenses.length).toString(),
        color: COLORS.info,
        icon: '📊'
      },
    ]);

    // Enhanced contribution analysis
    if (data.contributions.length > 0) {
      const contributionsByType = data.contributions.reduce((acc, contrib) => {
        acc[contrib.type] = (acc[contrib.type] || 0) + (contrib.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      const contributionTypeData = Object.entries(contributionsByType).map(([type, amount]) => ({
        type: type === 'monetary' ? '💰 Monetary' : '🎁 In-Kind',
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
        { title: '💰 CONTRIBUTIONS BY TYPE', headerColor: COLORS.success }
      );

      // Recent contributions with member details
      const recentContributions = data.contributions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
        .map(contribution => {
          const member = data.members.find(m => m.id === contribution.memberId);
          return {
            date: formatDate(contribution.date, 'MMM d'),
            member: member ? `👤 ${member.name}` : '❓ Unknown',
            type: contribution.type === 'monetary' ? '💰 Money' : '🎁 In-Kind',
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
        { title: '📝 RECENT CONTRIBUTIONS', headerColor: COLORS.success }
      );
    }

    // Enhanced expense analysis
    if (data.expenses.length > 0) {
      const expensesByCategory = data.expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const categoryIcons: Record<string, string> = {
        'equipment': '⚽',
        'transport': '🚌',
        'medical': '🏥',
        'facilities': '🏟️',
        'referees': '👨‍⚖️',
        'food': '🍽️',
        'uniforms': '👕',
        'training': '🏃',
        'administration': '📋',
        'other': '📦'
      };

      const expenseCategoryData = Object.entries(expensesByCategory).map(([category, amount]) => ({
        category: `${categoryIcons[category] || '📦'} ${category.charAt(0).toUpperCase() + category.slice(1)}`,
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
        { title: '💸 EXPENSES BY CATEGORY', headerColor: COLORS.danger }
      );

      // Recent expenses with enhanced formatting
      const recentExpenses = data.expenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
        .map(expense => ({
          date: formatDate(expense.date, 'MMM d'),
          category: `${categoryIcons[expense.category] || '📦'} ${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}`,
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
        { title: '📋 RECENT EXPENSES', headerColor: COLORS.danger }
      );
    }

    this.save('fitholics-fc-financial-report');
  }
}

/**
 * Enhanced Events PDF Export
 */
export class EventsPDFExporter extends BasePDFExporter {
  exportEvents(events: Event[], type: 'training' | 'friendly' | 'all' = 'all'): void {
    const filteredEvents = type === 'all' ? events : events.filter(e => e.type === type);
    const title = type === 'all' ? 'EVENTS CALENDAR' : type === 'training' ? 'TRAINING SCHEDULE' : 'FRIENDLY MATCHES';
    
    this.addHeader(title, `Complete schedule with ${filteredEvents.length} events`);

    // Enhanced event statistics
    const upcomingEvents = filteredEvents.filter(e => new Date(e.date) > new Date()).length;
    const pastEvents = filteredEvents.filter(e => new Date(e.date) <= new Date()).length;
    const trainingCount = filteredEvents.filter(e => e.type === 'training').length;
    const friendlyCount = filteredEvents.filter(e => e.type === 'friendly').length;

    const statsData = [
      { 
        label: 'Total Events', 
        value: filteredEvents.length.toString(),
        color: COLORS.primary,
        icon: '📅'
      },
      { 
        label: 'Upcoming', 
        value: upcomingEvents.toString(),
        color: COLORS.success,
        icon: '⏰'
      },
      { 
        label: 'Completed', 
        value: pastEvents.toString(),
        color: COLORS.info,
        icon: '✅'
      },
    ];

    if (type === 'all') {
      statsData.push({ 
        label: 'Training', 
        value: trainingCount.toString(),
        color: COLORS.warning,
        icon: '🏃'
      });
    }

    this.addStatsSection(statsData);

    // Monthly breakdown with visual elements
    const monthlyBreakdown = filteredEvents.reduce((acc, event) => {
      const month = new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyData = Object.entries(monthlyBreakdown).map(([month, count]) => ({
      month: `📅 ${month}`,
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
      { title: '📊 EVENTS BY MONTH', headerColor: COLORS.info }
    );

    // Complete events list with enhanced formatting
    const eventRows = filteredEvents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(event => ({
        date: formatDate(event.date, 'MMM d'),
        time: `⏰ ${event.time}`,
        type: event.type === 'training' ? '🏃 Training' : '⚽ Friendly',
        description: event.type === 'training' ? (event.description || 'Training Session') : `vs ${event.opponent}`,
        location: `📍 ${event.location}`,
        status: new Date(event.date) > new Date() ? '📅 Upcoming' : '✅ Completed',
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
      { title: '📋 COMPLETE SCHEDULE', headerColor: COLORS.primary }
    );

    this.save(`fitholics-fc-${type === 'all' ? 'events' : type}`);
  }
}

/**
 * Enhanced Attendance PDF Export
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

    // Enhanced attendance statistics
    this.addStatsSection([
      { 
        label: 'Total Sessions', 
        value: data.stats.totalSessions.toString(),
        color: COLORS.primary,
        icon: '📅'
      },
      { 
        label: 'Average Attendance', 
        value: data.stats.averageAttendance.toString(),
        color: COLORS.success,
        icon: '📊'
      },
      { 
        label: 'Best Attendance', 
        value: data.stats.highestAttendance.toString(),
        color: COLORS.warning,
        icon: '🏆'
      },
      { 
        label: 'Lowest Attendance', 
        value: data.stats.lowestAttendance.toString(),
        color: COLORS.info,
        icon: '📉'
      },
    ]);

    // Attendance by status with visual indicators
    const statusCounts = data.attendanceRecords.reduce((acc, record) => {
      acc[record.attendance.status] = (acc[record.attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusIcons: Record<string, string> = {
      'present': '✅',
      'absent': '❌',
      'late': '⏰',
      'excused': '📝'
    };

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      status: `${statusIcons[status] || '❓'} ${status.charAt(0).toUpperCase() + status.slice(1)}`,
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
      { title: '📊 ATTENDANCE BY STATUS', headerColor: COLORS.success }
    );

    // Detailed attendance records with enhanced formatting
    const attendanceRows = data.attendanceRecords
      .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
      .slice(0, 50)
      .map(record => ({
        date: formatDate(record.event.date, 'MMM d'),
        event: record.event.type === 'training' ? '🏃 Training' : `⚽ vs ${record.event.opponent}`,
        member: `👤 ${record.member.name}`,
        jersey: `#${record.member.jerseyNumber}`,
        status: `${statusIcons[record.attendance.status] || '❓'} ${record.attendance.status.charAt(0).toUpperCase() + record.attendance.status.slice(1)}`,
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
      { title: '📋 RECENT ATTENDANCE RECORDS', headerColor: COLORS.primary }
    );

    this.save('fitholics-fc-attendance');
  }
}

/**
 * Enhanced Leadership PDF Export
 */
export class LeadershipPDFExporter extends BasePDFExporter {
  exportLeadership(data: { leadership: Leadership[]; members: Member[] }): void {
    this.addHeader(
      'LEADERSHIP STRUCTURE', 
      `Organizational chart with ${data.leadership.length} leadership positions`
    );

    // Enhanced leadership statistics
    const activeRoles = data.leadership.filter(l => l.isActive).length;
    const inactiveRoles = data.leadership.filter(l => !l.isActive).length;
    const uniqueLeaders = new Set(data.leadership.map(l => l.memberId)).size;

    this.addStatsSection([
      { 
        label: 'Total Positions', 
        value: data.leadership.length.toString(),
        color: COLORS.primary,
        icon: '👔'
      },
      { 
        label: 'Active Roles', 
        value: activeRoles.toString(),
        color: COLORS.success,
        icon: '✅'
      },
      { 
        label: 'Inactive Roles', 
        value: inactiveRoles.toString(),
        color: COLORS.warning,
        icon: '⏸️'
      },
      { 
        label: 'Leaders', 
        value: uniqueLeaders.toString(),
        color: COLORS.info,
        icon: '👥'
      },
    ]);

    // Leadership by category with visual elements
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

    const categoryIcons: Record<string, string> = {
      'Technical Staff': '🏃‍♂️',
      'Team Leadership': '👑',
      'Administrative': '📋',
      'Other': '⚽'
    };

    const categoryData = Object.entries(categoryBreakdown).map(([category, count]) => ({
      category: `${categoryIcons[category] || '⚽'} ${category}`,
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
      { title: '📊 ROLES BY CATEGORY', headerColor: COLORS.warning }
    );

    // Complete leadership roster with enhanced formatting
    const roleIcons: Record<string, string> = {
      'Head Coach': '🏆',
      'Assistant Coach': '🥅',
      'Captain': '👑',
      'Vice Captain': '🔰',
      'Team Manager': '📋',
      'Secretary': '📝',
      'Treasurer': '💰',
      'Chairman': '🏛️',
      'Vice Chairman': '🏛️'
    };

    const leadershipRows = data.leadership
      .sort((a, b) => a.role.localeCompare(b.role))
      .map(leadership => {
        const member = data.members.find(m => m.id === leadership.memberId);
        return {
          member: member ? `👤 ${member.name}` : '❓ Unknown Member',
          jersey: member ? `#${member.jerseyNumber}` : 'N/A',
          role: `${roleIcons[leadership.role] || '⚽'} ${leadership.role}`,
          category: `${categoryIcons[getRoleCategory(leadership.role)] || '⚽'} ${getRoleCategory(leadership.role)}`,
          startDate: formatDate(leadership.startDate, 'MMM yyyy'),
          status: leadership.isActive ? '✅ Active' : '⏸️ Inactive',
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
      { title: '👔 LEADERSHIP DIRECTORY', headerColor: COLORS.primary }
    );

    this.save('fitholics-fc-leadership');
  }
}