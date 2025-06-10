import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendance, Contribution, Event, Member, Expense, Leadership } from '../types';
import { formatDate } from './date-utils';
import { formatUGX } from './currency-utils';

// PDF styling constants with enhanced design
const COLORS = {
  primary: '#4f4fe6',
  yellow: '#eab308',
  secondary: '#f43f4e',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  orange: '#f97316',
  gray: '#6b7280',
  darkGray: '#374151',
  lightGray: '#f9fafb',
  white: '#ffffff',
  black: '#000000',
};

const FONTS = {
  title: 20,
  subtitle: 16,
  heading: 14,
  subheading: 12,
  body: 10,
  small: 8,
  tiny: 7,
};

// Convert the uploaded logo to base64 (this will be the actual logo data)
const FITHOLICS_LOGO_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

/**
 * Base PDF export class with enhanced design and logo integration
 */
class BasePDFExporter {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number = 20;
  protected currentY: number = 20;
  protected logoSize: number = 25;

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF(orientation, 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Add enhanced header with logo, branding, and beautiful design
   */
  protected addHeader(title: string, subtitle?: string): void {
    // Add background gradient effect (simulated with rectangles)
    this.addHeaderBackground();

    // Add Fitholics FC logo
    this.addLogo();

    // Add company branding
    this.addBranding();

    // Add report title with enhanced styling
    this.addReportTitle(title, subtitle);

    // Add decorative line
    this.addDecorativeLine();

    this.currentY = this.margin + 65;
  }

  /**
   * Add header background with gradient effect
   */
  private addHeaderBackground(): void {
    // Main header background
    this.doc.setFillColor(COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 50, 'F');

    // Yellow accent stripe
    this.doc.setFillColor(COLORS.yellow);
    this.doc.rect(0, 45, this.pageWidth, 5, 'F');

    // Subtle gradient effect with multiple rectangles
    for (let i = 0; i < 10; i++) {
      const opacity = 0.1 - (i * 0.01);
      this.doc.setFillColor(255, 255, 255);
      this.doc.setGState(this.doc.GState({ opacity }));
      this.doc.rect(0, 50 + i, this.pageWidth, 1, 'F');
    }
    this.doc.setGState(this.doc.GState({ opacity: 1 })); // Reset opacity
  }

  /**
   * Add Fitholics FC logo
   */
  private addLogo(): void {
    try {
      // Add the logo with proper positioning
      this.doc.addImage(
        FITHOLICS_LOGO_BASE64, 
        'PNG', 
        this.margin, 
        this.margin - 5, 
        this.logoSize, 
        this.logoSize
      );

      // Add logo border/frame
      this.doc.setDrawColor(COLORS.white);
      this.doc.setLineWidth(2);
      this.doc.circle(this.margin + this.logoSize/2, this.margin + this.logoSize/2 - 5, this.logoSize/2 + 2, 'S');
    } catch (error) {
      console.warn('Logo could not be added to PDF:', error);
      // Fallback: Add a circular placeholder
      this.doc.setFillColor(COLORS.yellow);
      this.doc.circle(this.margin + this.logoSize/2, this.margin + this.logoSize/2 - 5, this.logoSize/2, 'F');
      
      this.doc.setTextColor(COLORS.white);
      this.doc.setFontSize(FONTS.heading);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('FC', this.margin + this.logoSize/2, this.margin + this.logoSize/2 - 2, { align: 'center' });
    }
  }

  /**
   * Add company branding text
   */
  private addBranding(): void {
    const brandingX = this.margin + this.logoSize + 15;

    // Main title
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(COLORS.white);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FITHOLICS FC', brandingX, this.margin + 5);

    // Subtitle
    this.doc.setFontSize(FONTS.body);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Team Management Portal', brandingX, this.margin + 12);

    // Tagline
    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Excellence • Teamwork • Victory', brandingX, this.margin + 18);

    // Add contact info on the right
    const rightX = this.pageWidth - this.margin;
    this.doc.setFontSize(FONTS.tiny);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('www.fitholicsfc.com', rightX, this.margin + 8, { align: 'right' });
    this.doc.text('info@fitholicsfc.com', rightX, this.margin + 13, { align: 'right' });
    this.doc.text('+256 700 000 000', rightX, this.margin + 18, { align: 'right' });
  }

  /**
   * Add report title with enhanced styling
   */
  private addReportTitle(title: string, subtitle?: string): void {
    // Report title background
    this.doc.setFillColor(COLORS.white);
    this.doc.roundedRect(this.margin, this.margin + 30, this.pageWidth - 2 * this.margin, 20, 3, 3, 'F');

    // Add shadow effect
    this.doc.setFillColor(200, 200, 200);
    this.doc.roundedRect(this.margin + 1, this.margin + 31, this.pageWidth - 2 * this.margin, 20, 3, 3, 'F');
    this.doc.setFillColor(COLORS.white);
    this.doc.roundedRect(this.margin, this.margin + 30, this.pageWidth - 2 * this.margin, 20, 3, 3, 'F');

    // Report title
    this.doc.setFontSize(FONTS.subtitle);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, this.margin + 40, { align: 'center' });

    if (subtitle) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.pageWidth / 2, this.margin + 46, { align: 'center' });
    }
  }

  /**
   * Add decorative line
   */
  private addDecorativeLine(): void {
    const lineY = this.margin + 55;
    
    // Main line
    this.doc.setDrawColor(COLORS.yellow);
    this.doc.setLineWidth(2);
    this.doc.line(this.margin, lineY, this.pageWidth - this.margin, lineY);

    // Decorative dots
    this.doc.setFillColor(COLORS.primary);
    for (let i = 0; i < 5; i++) {
      const x = this.margin + (i * (this.pageWidth - 2 * this.margin) / 4);
      this.doc.circle(x, lineY, 1, 'F');
    }
  }

  /**
   * Add enhanced footer with branding
   */
  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      const footerY = this.pageHeight - 20;
      
      // Footer background
      this.doc.setFillColor(COLORS.lightGray);
      this.doc.rect(0, footerY - 5, this.pageWidth, 25, 'F');

      // Footer border
      this.doc.setDrawColor(COLORS.yellow);
      this.doc.setLineWidth(1);
      this.doc.line(0, footerY - 5, this.pageWidth, footerY - 5);

      // Page number with styling
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
        `Generated on ${formatDate(new Date().toISOString(), 'MMM d, yyyy')} at ${new Date().toLocaleTimeString()}`,
        this.margin,
        footerY
      );

      // Footer branding
      this.doc.setFontSize(FONTS.tiny);
      this.doc.setTextColor(COLORS.gray);
      this.doc.text(
        '© 2024 Fitholics FC - Confidential Team Report',
        this.pageWidth / 2,
        footerY + 8,
        { align: 'center' }
      );
    }
  }

  /**
   * Add enhanced statistics section with beautiful cards
   */
  protected addStatsSection(stats: { label: string; value: string; color?: string; icon?: string }[]): void {
    const cardWidth = (this.pageWidth - this.margin * 2 - 10 * (stats.length - 1)) / stats.length;
    const cardHeight = 35;

    stats.forEach((stat, index) => {
      const x = this.margin + index * (cardWidth + 10);
      
      // Card shadow
      this.doc.setFillColor(200, 200, 200);
      this.doc.roundedRect(x + 1, this.currentY + 1, cardWidth, cardHeight, 3, 3, 'F');
      
      // Main card
      this.doc.setFillColor(stat.color || COLORS.lightGray);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 3, 3, 'F');
      
      // Card border
      this.doc.setDrawColor(COLORS.gray);
      this.doc.setLineWidth(0.5);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 3, 3, 'S');
      
      // Icon area (top section)
      if (stat.icon) {
        this.doc.setFillColor(255, 255, 255, 0.3);
        this.doc.roundedRect(x + 2, this.currentY + 2, cardWidth - 4, 12, 2, 2, 'F');
        
        // Icon placeholder (you can replace with actual icons)
        this.doc.setFontSize(FONTS.body);
        this.doc.setTextColor(COLORS.darkGray);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(stat.icon, x + cardWidth / 2, this.currentY + 10, { align: 'center' });
      }
      
      // Label
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(stat.label, x + cardWidth / 2, this.currentY + (stat.icon ? 20 : 12), { align: 'center' });
      
      // Value
      this.doc.setFontSize(FONTS.heading);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(stat.value, x + cardWidth / 2, this.currentY + (stat.icon ? 30 : 25), { align: 'center' });
    });

    this.currentY += cardHeight + 20;
  }

  /**
   * Add enhanced table with beautiful styling
   */
  protected addEnhancedTable(
    title: string,
    columns: { header: string; dataKey: string; width?: number }[],
    rows: any[],
    options: {
      headerColor?: string;
      alternateRowColor?: string;
      borderColor?: string;
      textColor?: string;
    } = {}
  ): void {
    this.checkPageBreak(60);

    // Table title
    this.doc.setFontSize(FONTS.subtitle);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 15;

    // Enhanced table styling
    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey] || '')),
      startY: this.currentY,
      styles: { 
        fontSize: FONTS.body, 
        cellPadding: 4,
        textColor: options.textColor || COLORS.darkGray,
        lineColor: options.borderColor || COLORS.gray,
        lineWidth: 0.5,
      },
      headStyles: { 
        fillColor: options.headerColor || COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: FONTS.body + 1,
      },
      alternateRowStyles: { 
        fillColor: options.alternateRowColor || COLORS.lightGray 
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

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
  }

  /**
   * Check if we need a new page
   */
  protected checkPageBreak(requiredHeight: number = 30): void {
    if (this.currentY + requiredHeight > this.pageHeight - 40) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
    }
  }

  /**
   * Add section divider
   */
  protected addSectionDivider(title?: string): void {
    this.checkPageBreak(20);
    
    if (title) {
      this.doc.setFontSize(FONTS.heading);
      this.doc.setTextColor(COLORS.primary);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(title, this.margin, this.currentY);
      this.currentY += 8;
    }

    // Decorative line
    this.doc.setDrawColor(COLORS.yellow);
    this.doc.setLineWidth(1);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 10;
  }

  /**
   * Save the PDF with enhanced filename
   */
  protected save(filename: string): void {
    this.addFooter();
    const timestamp = new Date().toISOString().split('T')[0];
    this.doc.save(`${filename}-${timestamp}.pdf`);
  }
}

/**
 * Enhanced Dashboard PDF Export
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
  }): void {
    this.addHeader('Dashboard Overview', `Team Performance Report - ${formatDate(new Date().toISOString())}`);

    // Enhanced statistics with icons
    this.addStatsSection([
      { label: 'Active Members', value: data.stats.activeMembers.toString(), color: '#dbeafe', icon: '👥' },
      { label: 'Training Sessions', value: data.stats.trainingSessionsThisMonth.toString(), color: '#dcfce7', icon: '🏃' },
      { label: 'Friendly Matches', value: data.stats.friendliesThisMonth.toString(), color: '#fef3c7', icon: '⚽' },
      { label: 'Team Balance', value: formatUGX(data.stats.remainingBalance), color: data.stats.remainingBalance >= 0 ? '#d1fae5' : '#fee2e2', icon: '💰' },
    ]);

    // Financial Summary Section
    this.addSectionDivider('Financial Summary');
    
    const financialData = [
      { metric: 'Total Contributions', amount: formatUGX(data.stats.totalContributions), status: 'Income' },
      { metric: 'Total Expenses', amount: formatUGX(data.stats.totalExpenses), status: 'Expense' },
      { metric: data.stats.remainingBalance >= 0 ? 'Available Balance' : 'Deficit', amount: formatUGX(Math.abs(data.stats.remainingBalance)), status: data.stats.remainingBalance >= 0 ? 'Positive' : 'Negative' },
    ];

    this.addEnhancedTable(
      'Financial Overview',
      [
        { header: 'Metric', dataKey: 'metric', width: 60 },
        { header: 'Amount (UGX)', dataKey: 'amount', width: 50 },
        { header: 'Status', dataKey: 'status', width: 30 },
      ],
      financialData,
      { headerColor: COLORS.green }
    );

    // Upcoming Events
    if (data.upcomingEvents.length > 0) {
      this.addSectionDivider('Upcoming Events');
      
      const eventRows = data.upcomingEvents.slice(0, 5).map(event => ({
        date: formatDate(event.date),
        type: event.type === 'training' ? 'Training Session' : `Friendly vs ${event.opponent}`,
        time: event.time,
        location: event.location,
        description: event.description || 'No description',
      }));

      this.addEnhancedTable(
        'Next 5 Events',
        [
          { header: 'Date', dataKey: 'date', width: 25 },
          { header: 'Event Type', dataKey: 'type', width: 45 },
          { header: 'Time', dataKey: 'time', width: 20 },
          { header: 'Location', dataKey: 'location', width: 35 },
        ],
        eventRows,
        { headerColor: COLORS.blue }
      );
    }

    // Recent Transactions
    if (data.recentTransactions.length > 0) {
      this.addSectionDivider('Recent Financial Activity');
      
      const transactionRows = data.recentTransactions.slice(0, 8).map(transaction => ({
        date: formatDate(transaction.date),
        type: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
        description: transaction.description,
        amount: `${transaction.type === 'contribution' ? '+' : '-'}${formatUGX(transaction.amount)}`,
      }));

      this.addEnhancedTable(
        'Latest Transactions',
        [
          { header: 'Date', dataKey: 'date', width: 25 },
          { header: 'Type', dataKey: 'type', width: 25 },
          { header: 'Description', dataKey: 'description', width: 60 },
          { header: 'Amount', dataKey: 'amount', width: 30 },
        ],
        transactionRows,
        { headerColor: COLORS.purple }
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
    this.addHeader('Team Members Directory', `Complete roster with ${members.length} registered members`);

    // Member statistics
    const activeMembers = members.filter(m => m.status === 'active').length;
    const inactiveMembers = members.filter(m => m.status === 'inactive').length;
    const injuredMembers = members.filter(m => m.status === 'injured').length;
    const suspendedMembers = members.filter(m => m.status === 'suspended').length;

    this.addStatsSection([
      { label: 'Total Members', value: members.length.toString(), color: '#dbeafe', icon: '👥' },
      { label: 'Active Players', value: activeMembers.toString(), color: '#d1fae5', icon: '✅' },
      { label: 'Inactive', value: inactiveMembers.toString(), color: '#fef3c7', icon: '⏸️' },
      { label: 'Injured', value: injuredMembers.toString(), color: '#fee2e2', icon: '🏥' },
    ]);

    // Position breakdown
    this.addSectionDivider('Squad Composition');
    
    const positionCounts = members.reduce((acc, member) => {
      acc[member.position] = (acc[member.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const positionData = Object.entries(positionCounts).map(([position, count]) => ({
      position,
      count: count.toString(),
      percentage: `${Math.round((count / members.length) * 100)}%`,
    }));

    this.addEnhancedTable(
      'Players by Position',
      [
        { header: 'Position', dataKey: 'position', width: 40 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
      ],
      positionData,
      { headerColor: COLORS.orange }
    );

    // Complete member roster
    this.addSectionDivider('Complete Member Roster');
    
    const memberRows = members
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
      .map(member => ({
        jersey: `#${member.jerseyNumber}`,
        name: member.name,
        position: member.position,
        status: member.status.charAt(0).toUpperCase() + member.status.slice(1),
        email: member.email,
        phone: member.phone,
        joined: formatDate(member.dateJoined),
      }));

    this.addEnhancedTable(
      'Full Team Roster',
      [
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Name', dataKey: 'name', width: 35 },
        { header: 'Position', dataKey: 'position', width: 25 },
        { header: 'Status', dataKey: 'status', width: 20 },
        { header: 'Email', dataKey: 'email', width: 45 },
        { header: 'Phone', dataKey: 'phone', width: 25 },
        { header: 'Joined', dataKey: 'joined', width: 20 },
      ],
      memberRows
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
    this.addHeader('Financial Report', `Contributions & Expenses Analysis - ${formatDate(new Date().toISOString())}`);

    // Financial overview
    this.addStatsSection([
      { label: 'Total Income', value: formatUGX(data.totalContributions), color: '#d1fae5', icon: '💰' },
      { label: 'Total Expenses', value: formatUGX(data.totalExpenses), color: '#fee2e2', icon: '💸' },
      { label: data.remainingBalance >= 0 ? 'Net Balance' : 'Deficit', value: formatUGX(Math.abs(data.remainingBalance)), color: data.remainingBalance >= 0 ? '#dbeafe' : '#fef3c7', icon: data.remainingBalance >= 0 ? '📈' : '📉' },
      { label: 'Transactions', value: (data.contributions.length + data.expenses.length).toString(), color: '#e0e7ff', icon: '📊' },
    ]);

    // Contribution analysis
    if (data.contributions.length > 0) {
      this.addSectionDivider('Contribution Analysis');
      
      const contributionsByType = data.contributions.reduce((acc, contrib) => {
        acc[contrib.type] = (acc[contrib.type] || 0) + (contrib.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      const contributionTypeData = Object.entries(contributionsByType).map(([type, amount]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        amount: formatUGX(amount),
        count: data.contributions.filter(c => c.type === type).length.toString(),
      }));

      this.addEnhancedTable(
        'Contributions by Type',
        [
          { header: 'Type', dataKey: 'type', width: 30 },
          { header: 'Total Amount', dataKey: 'amount', width: 40 },
          { header: 'Count', dataKey: 'count', width: 20 },
        ],
        contributionTypeData,
        { headerColor: COLORS.green }
      );

      // Recent contributions
      const recentContributions = data.contributions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(contribution => {
          const member = data.members.find(m => m.id === contribution.memberId);
          return {
            date: formatDate(contribution.date),
            member: member ? member.name : 'Unknown',
            type: contribution.type.charAt(0).toUpperCase() + contribution.type.slice(1),
            amount: contribution.amount ? formatUGX(contribution.amount) : 'N/A',
            description: contribution.description,
          };
        });

      this.addEnhancedTable(
        'Recent Contributions',
        [
          { header: 'Date', dataKey: 'date', width: 20 },
          { header: 'Member', dataKey: 'member', width: 30 },
          { header: 'Type', dataKey: 'type', width: 20 },
          { header: 'Amount', dataKey: 'amount', width: 25 },
          { header: 'Description', dataKey: 'description', width: 45 },
        ],
        recentContributions,
        { headerColor: COLORS.green }
      );
    }

    // Expense analysis
    if (data.expenses.length > 0) {
      this.addSectionDivider('Expense Analysis');
      
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

      this.addEnhancedTable(
        'Expenses by Category',
        [
          { header: 'Category', dataKey: 'category', width: 30 },
          { header: 'Total Amount', dataKey: 'amount', width: 30 },
          { header: 'Count', dataKey: 'count', width: 15 },
          { header: 'Percentage', dataKey: 'percentage', width: 20 },
        ],
        expenseCategoryData,
        { headerColor: COLORS.red }
      );

      // Recent expenses
      const recentExpenses = data.expenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(expense => ({
          date: formatDate(expense.date),
          category: expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
          amount: formatUGX(expense.amount),
          description: expense.description,
        }));

      this.addEnhancedTable(
        'Recent Expenses',
        [
          { header: 'Date', dataKey: 'date', width: 20 },
          { header: 'Category', dataKey: 'category', width: 25 },
          { header: 'Amount', dataKey: 'amount', width: 25 },
          { header: 'Description', dataKey: 'description', width: 50 },
        ],
        recentExpenses,
        { headerColor: COLORS.red }
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
    const title = type === 'all' ? 'Events Calendar' : type === 'training' ? 'Training Schedule' : 'Friendly Matches';
    
    this.addHeader(title, `Complete schedule with ${filteredEvents.length} events`);

    // Event statistics
    const upcomingEvents = filteredEvents.filter(e => new Date(e.date) > new Date()).length;
    const pastEvents = filteredEvents.filter(e => new Date(e.date) <= new Date()).length;
    const trainingCount = filteredEvents.filter(e => e.type === 'training').length;
    const friendlyCount = filteredEvents.filter(e => e.type === 'friendly').length;

    const statsData = [
      { label: 'Total Events', value: filteredEvents.length.toString(), color: '#dbeafe', icon: '📅' },
      { label: 'Upcoming', value: upcomingEvents.toString(), color: '#d1fae5', icon: '⏭️' },
      { label: 'Completed', value: pastEvents.toString(), color: '#fef3c7', icon: '✅' },
    ];

    if (type === 'all') {
      statsData.push(
        { label: 'Training', value: trainingCount.toString(), color: '#e0e7ff', icon: '🏃' },
        { label: 'Friendlies', value: friendlyCount.toString(), color: '#fce7f3', icon: '⚽' }
      );
    }

    this.addStatsSection(statsData);

    // Monthly breakdown
    this.addSectionDivider('Monthly Schedule');
    
    const monthlyBreakdown = filteredEvents.reduce((acc, event) => {
      const month = new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyData = Object.entries(monthlyBreakdown).map(([month, count]) => ({
      month,
      events: count.toString(),
      training: filteredEvents.filter(e => e.type === 'training' && new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) === month).length.toString(),
      friendlies: filteredEvents.filter(e => e.type === 'friendly' && new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) === month).length.toString(),
    }));

    this.addEnhancedTable(
      'Events by Month',
      [
        { header: 'Month', dataKey: 'month', width: 40 },
        { header: 'Total Events', dataKey: 'events', width: 25 },
        { header: 'Training', dataKey: 'training', width: 20 },
        { header: 'Friendlies', dataKey: 'friendlies', width: 20 },
      ],
      monthlyData,
      { headerColor: COLORS.purple }
    );

    // Complete events list
    this.addSectionDivider('Complete Events Schedule');
    
    const eventRows = filteredEvents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(event => ({
        date: formatDate(event.date),
        time: event.time,
        type: event.type === 'training' ? 'Training' : 'Friendly',
        description: event.type === 'training' ? (event.description || 'Training Session') : `vs ${event.opponent}`,
        location: event.location,
        status: new Date(event.date) > new Date() ? 'Upcoming' : 'Completed',
      }));

    this.addEnhancedTable(
      'Full Schedule',
      [
        { header: 'Date', dataKey: 'date', width: 20 },
        { header: 'Time', dataKey: 'time', width: 15 },
        { header: 'Type', dataKey: 'type', width: 20 },
        { header: 'Event Details', dataKey: 'description', width: 50 },
        { header: 'Location', dataKey: 'location', width: 30 },
        { header: 'Status', dataKey: 'status', width: 20 },
      ],
      eventRows
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
    this.addHeader('Attendance Report', `Comprehensive attendance analysis with ${data.attendanceRecords.length} records`);

    // Attendance statistics
    this.addStatsSection([
      { label: 'Total Sessions', value: data.stats.totalSessions.toString(), color: '#dbeafe', icon: '📊' },
      { label: 'Average Attendance', value: data.stats.averageAttendance.toString(), color: '#d1fae5', icon: '👥' },
      { label: 'Best Attendance', value: data.stats.highestAttendance.toString(), color: '#dcfce7', icon: '🏆' },
      { label: 'Lowest Attendance', value: data.stats.lowestAttendance.toString(), color: '#fef3c7', icon: '⚠️' },
    ]);

    // Attendance by status
    this.addSectionDivider('Attendance Analysis');
    
    const statusCounts = data.attendanceRecords.reduce((acc, record) => {
      acc[record.attendance.status] = (acc[record.attendance.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count: count.toString(),
      percentage: `${Math.round((count / data.attendanceRecords.length) * 100)}%`,
    }));

    this.addEnhancedTable(
      'Attendance by Status',
      [
        { header: 'Status', dataKey: 'status', width: 30 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
      ],
      statusData,
      { headerColor: COLORS.blue }
    );

    // Detailed attendance records
    this.addSectionDivider('Detailed Attendance Records');
    
    const attendanceRows = data.attendanceRecords
      .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
      .map(record => ({
        date: formatDate(record.event.date),
        event: record.event.type === 'training' ? 'Training' : `vs ${record.event.opponent}`,
        member: record.member.name,
        jersey: `#${record.member.jerseyNumber}`,
        status: record.attendance.status.charAt(0).toUpperCase() + record.attendance.status.slice(1),
        notes: record.attendance.notes || 'No notes',
      }));

    this.addEnhancedTable(
      'Complete Attendance Log',
      [
        { header: 'Date', dataKey: 'date', width: 20 },
        { header: 'Event', dataKey: 'event', width: 30 },
        { header: 'Member', dataKey: 'member', width: 30 },
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Status', dataKey: 'status', width: 20 },
        { header: 'Notes', dataKey: 'notes', width: 35 },
      ],
      attendanceRows
    );

    this.save('fitholics-fc-attendance');
  }
}

/**
 * Enhanced Leadership PDF Export
 */
export class LeadershipPDFExporter extends BasePDFExporter {
  exportLeadership(data: { leadership: Leadership[]; members: Member[] }): void {
    this.addHeader('Leadership Structure', `Organizational chart with ${data.leadership.length} leadership positions`);

    // Leadership statistics
    const activeRoles = data.leadership.filter(l => l.isActive).length;
    const inactiveRoles = data.leadership.filter(l => !l.isActive).length;
    const uniqueLeaders = new Set(data.leadership.map(l => l.memberId)).size;

    this.addStatsSection([
      { label: 'Total Positions', value: data.leadership.length.toString(), color: '#dbeafe', icon: '👑' },
      { label: 'Active Roles', value: activeRoles.toString(), color: '#d1fae5', icon: '✅' },
      { label: 'Inactive Roles', value: inactiveRoles.toString(), color: '#fef3c7', icon: '⏸️' },
      { label: 'Leaders', value: uniqueLeaders.toString(), color: '#e0e7ff', icon: '👥' },
    ]);

    // Leadership by category
    this.addSectionDivider('Leadership Categories');
    
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
      category,
      count: count.toString(),
      percentage: `${Math.round((count / data.leadership.length) * 100)}%`,
    }));

    this.addEnhancedTable(
      'Roles by Category',
      [
        { header: 'Category', dataKey: 'category', width: 40 },
        { header: 'Count', dataKey: 'count', width: 20 },
        { header: 'Percentage', dataKey: 'percentage', width: 25 },
      ],
      categoryData,
      { headerColor: COLORS.yellow, textColor: COLORS.black }
    );

    // Complete leadership roster
    this.addSectionDivider('Complete Leadership Roster');
    
    const leadershipRows = data.leadership
      .sort((a, b) => a.role.localeCompare(b.role))
      .map(leadership => {
        const member = data.members.find(m => m.id === leadership.memberId);
        return {
          member: member ? member.name : 'Unknown Member',
          jersey: member ? `#${member.jerseyNumber}` : 'N/A',
          role: leadership.role,
          category: getRoleCategory(leadership.role),
          startDate: formatDate(leadership.startDate),
          status: leadership.isActive ? 'Active' : 'Inactive',
        };
      });

    this.addEnhancedTable(
      'Leadership Directory',
      [
        { header: 'Member', dataKey: 'member', width: 30 },
        { header: 'Jersey', dataKey: 'jersey', width: 15 },
        { header: 'Role', dataKey: 'role', width: 35 },
        { header: 'Category', dataKey: 'category', width: 25 },
        { header: 'Start Date', dataKey: 'startDate', width: 20 },
        { header: 'Status', dataKey: 'status', width: 15 },
      ],
      leadershipRows
    );

    this.save('fitholics-fc-leadership');
  }
}