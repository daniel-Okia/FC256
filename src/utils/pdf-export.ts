import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendance, Contribution, Event, Member, Expense, Leadership } from '../types';
import type { InventoryItem } from '../types';
import { formatDate } from './date-utils';
import { formatUGX } from './currency-utils';

// Professional PDF styling
const COLORS = {
  primary: [30, 64, 175],      // Deep blue
  yellow: [217, 119, 6],       // Bright orange-yellow
  secondary: [220, 38, 38],    // Clear red
  success: [5, 150, 105],      // Clear green
  danger: [220, 38, 38],       // Clear red
  warning: [217, 119, 6],      // Orange
  info: [2, 132, 199],         // Clear blue
  gray: [55, 65, 81],          // Dark gray
  white: [255, 255, 255],
  black: [0, 0, 0],
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
 * Base PDF export class with proper data handling
 */
class BasePDFExporter {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number = 20;
  protected currentY: number = 20;
  protected footerHeight: number = 40;
  protected headerHeight: number = 100;

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF(orientation, 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Add professional header with updated manager contact
   */
  protected addHeader(title: string, subtitle?: string): void {
    // Header background
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 60, 'F');
    
    // Team name
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FC256', this.margin, this.margin + 15);
    
    // Core values
    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Excellence • Discipline • Teamwork', this.margin, this.margin + 25);
    
    // Manager contact section - UPDATED CONTACT
    const contactBoxWidth = 75;
    const contactBoxHeight = 32;
    const contactX = this.pageWidth - contactBoxWidth - this.margin;
    const contactY = this.margin + 10;
    
    // White background box
    this.doc.setFillColor(...COLORS.white);
    this.doc.roundedRect(contactX, contactY, contactBoxWidth, contactBoxHeight, 3, 3, 'F');
    
    // Border
    this.doc.setDrawColor(...COLORS.yellow);
    this.doc.setLineWidth(1.5);
    this.doc.roundedRect(contactX, contactY, contactBoxWidth, contactBoxHeight, 3, 3, 'S');
    
    // Manager details with UPDATED phone number
    const textX = contactX + 4;
    let textY = contactY + 7;
    
    this.doc.setFontSize(FONTS.tiny);
    this.doc.setTextColor(...COLORS.gray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TEAM MANAGER', textX, textY);
    textY += 6;
    
    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text('Pius Paul', textX, textY);
    textY += 5;
    
    this.doc.setFontSize(FONTS.tiny);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.gray);
    
    this.doc.text('Email: piuspaul392@gmail.com', textX, textY);
    textY += 4;
    this.doc.text('Phone: +256782633089', textX, textY); // UPDATED PHONE
    textY += 4;
    this.doc.text('Position: Team Manager', textX, textY);
    
    // Separator line
    this.doc.setDrawColor(...COLORS.yellow);
    this.doc.setLineWidth(2);
    this.doc.line(this.margin, 65, this.pageWidth - this.margin, 65);
    
    // Report title
    this.doc.setFontSize(FONTS.subtitle);
    this.doc.setTextColor(...COLORS.gray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, 80);
    
    if (subtitle) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor(...COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, 88);
    }
    
    this.currentY = this.headerHeight;
  }

  /**
   * Add statistics cards
   */
  protected addStatsSection(stats: { label: string; value: string; color?: number[] }[]): void {
    const cardWidth = (this.pageWidth - this.margin * 2 - 8 * (stats.length - 1)) / stats.length;
    const cardHeight = 35;

    this.checkPageBreak(cardHeight + 25);

    stats.forEach((stat, index) => {
      const x = this.margin + index * (cardWidth + 8);
      const cardColor = stat.color || COLORS.primary;
      
      // Card background
      this.doc.setFillColor(...COLORS.white);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 4, 4, 'F');
      
      // Card border
      this.doc.setDrawColor(...cardColor);
      this.doc.setLineWidth(2);
      this.doc.roundedRect(x, this.currentY, cardWidth, cardHeight, 4, 4, 'S');
      
      // Colored top bar
      this.doc.setFillColor(...cardColor);
      this.doc.roundedRect(x, this.currentY, cardWidth, 8, 4, 4, 'F');
      this.doc.rect(x, this.currentY + 4, cardWidth, 4, 'F');
      
      // Label
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(...COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(stat.label, x + cardWidth / 2, this.currentY + 18, { align: 'center' });
      
      // Value
      this.doc.setFontSize(FONTS.heading);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...COLORS.gray);
      this.doc.text(stat.value, x + cardWidth / 2, this.currentY + 28, { align: 'center' });
    });

    this.currentY += cardHeight + 25;
  }

  /**
   * Add section heading
   */
  protected addSectionHeading(title: string, color: number[] = COLORS.primary): void {
    this.checkPageBreak(25);
    
    this.doc.setFillColor(...color);
    this.doc.rect(this.margin - 5, this.currentY - 3, this.pageWidth - this.margin * 2 + 10, 18, 'F');
    
    this.doc.setFontSize(FONTS.heading);
    this.doc.setTextColor(...COLORS.white);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY + 8);
    
    this.currentY += 30;
  }

  /**
   * Add table with proper data handling
   */
  protected addTable(
    columns: { header: string; dataKey: string; width?: number }[],
    data: any[],
    options: { title?: string; headerColor?: number[] } = {}
  ): void {
    console.log('Adding table:', {
      title: options.title,
      columns: columns.length,
      dataRows: data.length,
      sampleData: data.slice(0, 2)
    });

    this.checkPageBreak(60);

    if (options.title) {
      this.addSectionHeading(options.title, options.headerColor);
    }

    if (data.length === 0) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor(...COLORS.gray);
      this.doc.setFont('helvetica', 'italic');
      this.doc.text('No data available for this section.', this.margin, this.currentY);
      this.currentY += 20;
      return;
    }

    // Process data to ensure all values are strings and handle nested objects
    const processedData = data.map((row, rowIndex) => {
      const processedRow = columns.map(col => {
        try {
          let value = row[col.dataKey];
          
          // Handle undefined/null values
          if (value === undefined || value === null) {
            return '';
          }
          
          // Handle objects and arrays
          if (typeof value === 'object') {
            if (Array.isArray(value)) {
              return value.join(', ');
            }
            return JSON.stringify(value);
          }
          
          // Convert to string
          return String(value);
        } catch (error) {
          console.error(`Error processing cell [${rowIndex}][${col.dataKey}]:`, error);
          return 'Error';
        }
      });
      
      console.log(`Row ${rowIndex}:`, processedRow);
      return processedRow;
    });

    const headerColor = options.headerColor || COLORS.primary;

    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: processedData,
      startY: this.currentY,
      styles: { 
        fontSize: FONTS.small,
        cellPadding: 3,
        textColor: COLORS.gray,
        lineColor: [229, 231, 235],
        lineWidth: 0.5,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
      },
      headStyles: { 
        fillColor: headerColor,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: FONTS.small,
        cellPadding: 4,
        halign: 'center',
        valign: 'middle',
      },
      alternateRowStyles: { 
        fillColor: [249, 250, 251]
      },
      margin: { 
        left: this.margin, 
        right: this.margin,
        bottom: this.footerHeight + 10
      },
      theme: 'grid',
      pageBreak: 'auto',
      showHead: 'everyPage',
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 20;
    
    if (this.currentY > this.pageHeight - this.footerHeight - 20) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
    }
  }

  /**
   * Add footer
   */
  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      const footerY = this.pageHeight - 25;
      
      this.doc.setDrawColor(...COLORS.yellow);
      this.doc.setLineWidth(1);
      this.doc.line(this.margin, footerY - 8, this.pageWidth - this.margin, footerY - 8);

      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(...COLORS.gray);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        footerY - 2,
        { align: 'right' }
      );

      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        this.margin,
        footerY - 2
      );

      this.doc.setFontSize(FONTS.tiny);
      this.doc.text(
        'Confidential - FC256 Internal Report',
        this.pageWidth / 2,
        footerY + 5,
        { align: 'center' }
      );
    }
  }

  protected checkPageBreak(requiredHeight: number = 35): void {
    const availableSpace = this.pageHeight - this.currentY - this.footerHeight - 10;
    
    if (requiredHeight > availableSpace) {
      this.doc.addPage();
      this.currentY = this.margin + 20;
    }
  }

  protected save(filename: string): void {
    this.addFooter();
    const timestamp = new Date().toISOString().split('T')[0];
    this.doc.save(`${filename}-${timestamp}.pdf`);
  }
}

/**
 * Dashboard PDF Export
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
    console.log('Exporting dashboard with data:', data);

    const dateRangeText = data.dateRange 
      ? `Filtered: ${formatDate(data.dateRange.startDate)} to ${formatDate(data.dateRange.endDate)}`
      : `Generated: ${formatDate(new Date().toISOString())}`;
      
    this.addHeader(
      data.dateRange ? 'FILTERED DASHBOARD REPORT' : 'DASHBOARD OVERVIEW', 
      `Team Performance Analysis - ${dateRangeText}`
    );

    // Team statistics
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

    // Financial Summary
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

    this.addTable(
      [
        { header: 'Financial Metric', dataKey: 'metric' },
        { header: 'Amount (UGX)', dataKey: 'amount' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Category', dataKey: 'category' },
      ],
      financialData,
      { 
        title: data.dateRange ? 'FINANCIAL SUMMARY (FILTERED PERIOD)' : 'FINANCIAL SUMMARY',
        headerColor: COLORS.success 
      }
    );

    // Upcoming Events
    if (data.upcomingEvents && data.upcomingEvents.length > 0) {
      const eventRows = data.upcomingEvents.slice(0, 8).map(event => ({
        date: formatDate(event.date, 'MMM d, yyyy'),
        type: event.type === 'training' ? 'Training Session' : `Friendly vs ${event.opponent || 'TBD'}`,
        time: event.time || 'TBD',
        location: event.location || 'TBD',
        status: 'Scheduled',
      }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Event Type', dataKey: 'type' },
          { header: 'Time', dataKey: 'time' },
          { header: 'Location', dataKey: 'location' },
          { header: 'Status', dataKey: 'status' },
        ],
        eventRows,
        { 
          title: data.dateRange ? 'UPCOMING EVENTS (IN FILTERED PERIOD)' : 'UPCOMING EVENTS', 
          headerColor: COLORS.info 
        }
      );
    }

    // Recent Transactions
    if (data.recentTransactions && data.recentTransactions.length > 0) {
      const transactionRows = data.recentTransactions.slice(0, 12).map(transaction => ({
        date: formatDate(transaction.date, 'MMM d, yyyy'),
        type: transaction.type === 'contribution' ? 'Income' : 'Expense',
        description: transaction.description || 'No description',
        amount: `${transaction.type === 'contribution' ? '+' : '-'}${formatUGX(transaction.amount || 0)}`,
        status: transaction.type === 'contribution' ? 'Credit' : 'Debit',
      }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Type', dataKey: 'type' },
          { header: 'Description', dataKey: 'description' },
          { header: 'Amount', dataKey: 'amount' },
          { header: 'Status', dataKey: 'status' },
        ],
        transactionRows,
        { 
          title: data.dateRange ? 'TRANSACTIONS (FILTERED PERIOD)' : 'RECENT TRANSACTIONS', 
          headerColor: COLORS.warning 
        }
      );
    }

    const filename = data.dateRange 
      ? `fc256-dashboard-filtered-${data.dateRange.startDate}-to-${data.dateRange.endDate}`
      : 'fc256-dashboard';
      
    this.save(filename);
  }
}

/**
 * Members PDF Export
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

    this.addTable(
      [
        { header: 'Position', dataKey: 'position' },
        { header: 'Count', dataKey: 'count' },
        { header: 'Percentage', dataKey: 'percentage' },
        { header: 'Coverage Status', dataKey: 'status' },
      ],
      positionData,
      { title: 'SQUAD COMPOSITION BY POSITION', headerColor: COLORS.info }
    );

    // Complete member roster
    const memberRows = members
      .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
      .map(member => ({
        jersey: `#${member.jerseyNumber}`,
        name: member.name || 'Unknown',
        position: member.position || 'Unknown',
        status: (member.status || 'unknown').charAt(0).toUpperCase() + (member.status || 'unknown').slice(1),
        email: member.email || 'No email',
        phone: member.phone || 'No phone',
        joined: formatDate(member.dateJoined, 'MMM d, yyyy'),
      }));

    this.addTable(
      [
        { header: 'Jersey', dataKey: 'jersey' },
        { header: 'Full Name', dataKey: 'name' },
        { header: 'Position', dataKey: 'position' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Email Address', dataKey: 'email' },
        { header: 'Phone Number', dataKey: 'phone' },
        { header: 'Date Joined', dataKey: 'joined' },
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
    console.log('Exporting contributions with data:', data);
    
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

    // Recent contributions
    if (data.contributions.length > 0) {
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
            description: contribution.description || 'No description',
            method: contribution.paymentMethod || 'N/A'
          };
        });

      this.addTable(
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Member Name', dataKey: 'member' },
          { header: 'Type', dataKey: 'type' },
          { header: 'Amount', dataKey: 'amount' },
          { header: 'Description', dataKey: 'description' },
          { header: 'Payment Method', dataKey: 'method' },
        ],
        recentContributions,
        { title: 'RECENT CONTRIBUTIONS RECORD', headerColor: COLORS.success }
      );
    }

    // Recent expenses
    if (data.expenses.length > 0) {
      const recentExpenses = data.expenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20)
        .map(expense => ({
          date: formatDate(expense.date, 'MMM d, yyyy'),
          category: (expense.category || 'other').charAt(0).toUpperCase() + (expense.category || 'other').slice(1).replace(/[_-]/g, ' '),
          amount: formatUGX(expense.amount || 0),
          description: expense.description || 'No description',
          method: expense.paymentMethod || 'N/A',
          receipt: expense.receipt || 'No receipt'
        }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Category', dataKey: 'category' },
          { header: 'Amount', dataKey: 'amount' },
          { header: 'Description', dataKey: 'description' },
          { header: 'Payment Method', dataKey: 'method' },
          { header: 'Receipt', dataKey: 'receipt' },
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
    
    console.log('Exporting events:', { total: events.length, filtered: filteredEvents.length, type });
    
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

    // Complete events list
    const eventRows = filteredEvents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(event => ({
        date: formatDate(event.date, 'MMM d, yyyy'),
        time: event.time || 'TBD',
        type: event.type === 'training' ? 'Training Session' : 'Friendly Match',
        description: event.type === 'training' 
          ? (event.description || 'Training Session') 
          : `vs ${event.opponent || 'TBD'}`,
        location: event.location || 'TBD',
        status: new Date(event.date) > new Date() ? 'Upcoming' : 'Completed',
      }));

    this.addTable(
      [
        { header: 'Date', dataKey: 'date' },
        { header: 'Time', dataKey: 'time' },
        { header: 'Event Type', dataKey: 'type' },
        { header: 'Details', dataKey: 'description' },
        { header: 'Location', dataKey: 'location' },
        { header: 'Status', dataKey: 'status' },
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
    console.log('Exporting attendance with data:', data);
    
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

    // Detailed attendance records
    const attendanceRows = data.attendanceRecords
      .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
      .slice(0, 50)
      .map(record => ({
        date: formatDate(record.event.date, 'MMM d, yyyy'),
        event: record.event.type === 'training' 
          ? 'Training Session' 
          : `Friendly vs ${record.event.opponent || 'TBD'}`,
        member: record.member.name || 'Unknown',
        jersey: `#${record.member.jerseyNumber}`,
        position: record.member.position || 'Unknown',
        status: (record.attendance.status || 'unknown').charAt(0).toUpperCase() + (record.attendance.status || 'unknown').slice(1),
        notes: record.attendance.notes || 'No notes',
      }));

    this.addTable(
      [
        { header: 'Date', dataKey: 'date' },
        { header: 'Event', dataKey: 'event' },
        { header: 'Member', dataKey: 'member' },
        { header: 'Jersey', dataKey: 'jersey' },
        { header: 'Position', dataKey: 'position' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Notes', dataKey: 'notes' },
      ],
      attendanceRows,
      { title: 'DETAILED ATTENDANCE RECORDS', headerColor: COLORS.primary }
    );

    this.save('fc256-attendance');
  }
}

/**
 * Leadership PDF Export
 */
export class LeadershipPDFExporter extends BasePDFExporter {
  exportLeadership(data: { leadership: Leadership[]; members: Member[] }): void {
    console.log('Exporting leadership with data:', data);
    
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

    // Complete leadership roster
    const leadershipRows = data.leadership
      .sort((a, b) => a.role.localeCompare(b.role))
      .map(leadership => {
        const member = data.members.find(m => m.id === leadership.memberId);
        return {
          member: member ? member.name : 'Unknown Member',
          jersey: member ? `#${member.jerseyNumber}` : 'N/A',
          role: leadership.role || 'Unknown Role',
          startDate: formatDate(leadership.startDate, 'MMM d, yyyy'),
          status: leadership.isActive ? 'Active' : 'Inactive',
          duration: this.calculateDuration(leadership.startDate)
        };
      });

    this.addTable(
      [
        { header: 'Member Name', dataKey: 'member' },
        { header: 'Jersey', dataKey: 'jersey' },
        { header: 'Leadership Role', dataKey: 'role' },
        { header: 'Start Date', dataKey: 'startDate' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Duration', dataKey: 'duration' },
      ],
      leadershipRows,
      { title: 'COMPLETE LEADERSHIP DIRECTORY', headerColor: COLORS.primary }
    );

    this.save('fc256-leadership');
  }

  private calculateDuration(startDate: string): string {
    try {
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
    } catch (error) {
      return 'Unknown';
    }
  }
}

/**
 * Inventory PDF Export
 */
export class InventoryPDFExporter extends BasePDFExporter {
  exportInventory(data: {
    inventoryItems: InventoryItem[];
    stats: {
      totalItems: number;
      lowStockItems: number;
      fullyStockedItems: number;
      needsReplacement: number;
      totalValue: number;
    };
  }): void {
    console.log('Exporting inventory with data:', data);
    
    this.addHeader(
      'EQUIPMENT INVENTORY REPORT', 
      `Complete equipment tracking with ${data.inventoryItems.length} items`
    );

    // Inventory statistics
    this.addStatsSection([
      { 
        label: 'Total Items', 
        value: data.stats.totalItems.toString(),
        color: COLORS.primary,
      },
      { 
        label: 'Fully Stocked', 
        value: data.stats.fullyStockedItems.toString(),
        color: COLORS.success,
      },
      { 
        label: 'Low Stock Alert', 
        value: data.stats.lowStockItems.toString(),
        color: COLORS.warning,
      },
      { 
        label: 'Total Value', 
        value: formatUGX(data.stats.totalValue),
        color: COLORS.info,
      },
    ]);

    // Category breakdown
    const categoryBreakdown = data.inventoryItems.reduce((acc, item) => {
      const category = item.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => ({
        category,
        count: count.toString(),
        percentage: `${Math.round((count / data.inventoryItems.length) * 100)}%`,
        status: count >= 5 ? 'Well Stocked' : count >= 3 ? 'Adequate' : 'Limited'
      }));

    this.addTable(
      [
        { header: 'Category', dataKey: 'category' },
        { header: 'Item Count', dataKey: 'count' },
        { header: 'Percentage', dataKey: 'percentage' },
        { header: 'Status', dataKey: 'status' },
      ],
      categoryData,
      { title: 'INVENTORY BY CATEGORY', headerColor: COLORS.info }
    );

    // Low stock items (priority section)
    const lowStockItems = data.inventoryItems
      .filter(item => item.status === 'low_stock' || item.status === 'out_of_stock' || item.status === 'needs_replacement')
      .map(item => ({
        name: item.name,
        category: item.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        current: item.quantity.toString(),
        minimum: item.minQuantity.toString(),
        status: item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        allocatedMembers: item.allocatedMembers && item.allocatedMembers.length > 0 
          ? `${item.allocatedMembers.length} member(s)`
          : 'None',
        priority: item.status === 'out_of_stock' ? 'URGENT' : item.status === 'needs_replacement' ? 'HIGH' : 'MEDIUM'
      }));

    if (lowStockItems.length > 0) {
      this.addTable(
        [
          { header: 'Item Name', dataKey: 'name' },
          { header: 'Category', dataKey: 'category' },
          { header: 'Current', dataKey: 'current' },
          { header: 'Minimum', dataKey: 'minimum' },
          { header: 'Status', dataKey: 'status' },
          { header: 'Allocated Members', dataKey: 'allocatedMembers' },
          { header: 'Priority', dataKey: 'priority' },
        ],
        lowStockItems,
        { title: 'LOW STOCK ALERTS - IMMEDIATE ATTENTION REQUIRED', headerColor: COLORS.warning }
      );
    }

    // Complete inventory listing
    const inventoryRows = data.inventoryItems
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(item => ({
        name: item.name,
        category: item.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        quantity: `${item.quantity}/${item.maxQuantity}`,
        condition: item.condition.replace(/\b\w/g, l => l.toUpperCase()),
        status: item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        allocatedMembers: item.allocatedMembers && item.allocatedMembers.length > 0 
          ? `${item.allocatedMembers.length} member(s) assigned`
          : 'No members assigned',
        lastChecked: formatDate(item.lastChecked, 'MMM d, yyyy'),
      }));

    this.addTable(
      [
        { header: 'Item Name', dataKey: 'name' },
        { header: 'Category', dataKey: 'category' },
        { header: 'Stock Level', dataKey: 'quantity' },
        { header: 'Condition', dataKey: 'condition' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Allocated Members', dataKey: 'allocatedMembers' },
        { header: 'Last Checked', dataKey: 'lastChecked' },
      ],
      inventoryRows,
      { title: 'COMPLETE INVENTORY LISTING', headerColor: COLORS.primary }
    );

    this.save('fc256-inventory');
  }
}