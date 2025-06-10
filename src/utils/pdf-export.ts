import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendance, Contribution, Event, Member, Expense, Leadership } from '../types';
import { formatDate } from './date-utils';
import { formatUGX } from './currency-utils';

// PDF styling constants - simplified and formal
const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  accent: '#0f172a',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
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
};

/**
 * Base PDF export class with clean, formal design
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
   * Add formal header with team branding
   */
  protected addHeader(title: string, subtitle?: string): void {
    // Team name and branding
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(COLORS.primary);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FITHOLICS FC', this.margin, this.margin + 8);

    // Core values
    this.doc.setFontSize(FONTS.small);
    this.doc.setTextColor(COLORS.secondary);
    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Excellence • Discipline • Teamwork', this.margin, this.margin + 15);

    // Manager contact info (right aligned)
    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Manager: Pius Paul', this.pageWidth - this.margin, this.margin + 8, { align: 'right' });
    this.doc.text('Email: piuspaul392@gmail.com', this.pageWidth - this.margin, this.margin + 13, { align: 'right' });
    this.doc.text('Phone: +256 700 654 321', this.pageWidth - this.margin, this.margin + 18, { align: 'right' });

    // Horizontal line separator
    this.doc.setDrawColor(COLORS.gray);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.margin + 25, this.pageWidth - this.margin, this.margin + 25);

    // Report title
    this.doc.setFontSize(FONTS.subtitle);
    this.doc.setTextColor(COLORS.accent);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.margin + 40);

    if (subtitle) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, this.margin + 48);
    }

    this.currentY = this.margin + 60;
  }

  /**
   * Add simple statistics section
   */
  protected addStatsSection(stats: { label: string; value: string }[]): void {
    const boxWidth = (this.pageWidth - this.margin * 2 - 10 * (stats.length - 1)) / stats.length;
    const boxHeight = 25;

    stats.forEach((stat, index) => {
      const x = this.margin + index * (boxWidth + 10);
      
      // Simple box with border
      this.doc.setDrawColor(COLORS.gray);
      this.doc.setLineWidth(0.5);
      this.doc.rect(x, this.currentY, boxWidth, boxHeight);
      
      // Label
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(stat.label, x + boxWidth / 2, this.currentY + 8, { align: 'center' });
      
      // Value
      this.doc.setFontSize(FONTS.heading);
      this.doc.setTextColor(COLORS.accent);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(stat.value, x + boxWidth / 2, this.currentY + 18, { align: 'center' });
    });

    this.currentY += boxHeight + 20;
  }

  /**
   * Add section heading
   */
  protected addSectionHeading(title: string): void {
    this.checkPageBreak(20);
    
    this.doc.setFontSize(FONTS.heading);
    this.doc.setTextColor(COLORS.primary);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    
    // Underline
    this.doc.setDrawColor(COLORS.primary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY + 2, this.margin + 60, this.currentY + 2);
    
    this.currentY += 15;
  }

  /**
   * Add simple table
   */
  protected addTable(
    columns: { header: string; dataKey: string }[],
    rows: any[],
    options: { title?: string } = {}
  ): void {
    this.checkPageBreak(60);

    if (options.title) {
      this.addSectionHeading(options.title);
    }

    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey] || '')),
      startY: this.currentY,
      styles: { 
        fontSize: FONTS.body, 
        cellPadding: 3,
        textColor: COLORS.accent,
        lineColor: COLORS.gray,
        lineWidth: 0.1,
      },
      headStyles: { 
        fillColor: COLORS.lightGray,
        textColor: COLORS.accent,
        fontStyle: 'bold',
      },
      alternateRowStyles: { 
        fillColor: '#fafafa'
      },
      margin: { left: this.margin, right: this.margin },
      tableWidth: 'auto',
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
  }

  /**
   * Add footer
   */
  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      const footerY = this.pageHeight - 15;
      
      // Footer line
      this.doc.setDrawColor(COLORS.gray);
      this.doc.setLineWidth(0.5);
      this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5);

      // Page number
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        footerY,
        { align: 'right' }
      );

      // Generation info
      this.doc.text(
        `Generated: ${formatDate(new Date().toISOString(), 'MMM d, yyyy')} at ${new Date().toLocaleTimeString()}`,
        this.margin,
        footerY
      );

      // Confidentiality notice
      this.doc.setFontSize(FONTS.small - 1);
      this.doc.text(
        'Confidential - Fitholics FC Internal Report',
        this.pageWidth / 2,
        footerY + 5,
        { align: 'center' }
      );
    }
  }

  /**
   * Check if we need a new page
   */
  protected checkPageBreak(requiredHeight: number = 30): void {
    if (this.currentY + requiredHeight > this.pageHeight - 30) {
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
  }): void {
    this.addHeader('Dashboard Overview', `Team Performance Report - ${formatDate(new Date().toISOString())}`);

    // Team statistics
    this.addStatsSection([
      { label: 'Active Members', value: data.stats.activeMembers.toString() },
      { label: 'Training Sessions', value: data.stats.trainingSessionsThisMonth.toString() },
      { label: 'Friendly Matches', value: data.stats.friendliesThisMonth.toString() },
      { label: 'Team Balance', value: formatUGX(data.stats.remainingBalance) },
    ]);

    // Financial Summary
    this.addSectionHeading('Financial Summary');
    
    const financialData = [
      { metric: 'Total Contributions', amount: formatUGX(data.stats.totalContributions) },
      { metric: 'Total Expenses', amount: formatUGX(data.stats.totalExpenses) },
      { metric: data.stats.remainingBalance >= 0 ? 'Available Balance' : 'Deficit', amount: formatUGX(Math.abs(data.stats.remainingBalance)) },
    ];

    this.addTable(
      [
        { header: 'Financial Metric', dataKey: 'metric' },
        { header: 'Amount (UGX)', dataKey: 'amount' },
      ],
      financialData
    );

    // Upcoming Events
    if (data.upcomingEvents.length > 0) {
      const eventRows = data.upcomingEvents.slice(0, 5).map(event => ({
        date: formatDate(event.date),
        type: event.type === 'training' ? 'Training Session' : `Friendly vs ${event.opponent}`,
        time: event.time,
        location: event.location,
      }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Event Type', dataKey: 'type' },
          { header: 'Time', dataKey: 'time' },
          { header: 'Location', dataKey: 'location' },
        ],
        eventRows,
        { title: 'Upcoming Events' }
      );
    }

    // Recent Transactions
    if (data.recentTransactions.length > 0) {
      const transactionRows = data.recentTransactions.slice(0, 8).map(transaction => ({
        date: formatDate(transaction.date),
        type: transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
        description: transaction.description,
        amount: `${transaction.type === 'contribution' ? '+' : '-'}${formatUGX(transaction.amount)}`,
      }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Type', dataKey: 'type' },
          { header: 'Description', dataKey: 'description' },
          { header: 'Amount', dataKey: 'amount' },
        ],
        transactionRows,
        { title: 'Recent Transactions' }
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
    this.addHeader('Team Members Directory', `Complete roster with ${members.length} registered members`);

    // Member statistics
    const activeMembers = members.filter(m => m.status === 'active').length;
    const inactiveMembers = members.filter(m => m.status === 'inactive').length;
    const injuredMembers = members.filter(m => m.status === 'injured').length;

    this.addStatsSection([
      { label: 'Total Members', value: members.length.toString() },
      { label: 'Active Players', value: activeMembers.toString() },
      { label: 'Inactive', value: inactiveMembers.toString() },
      { label: 'Injured', value: injuredMembers.toString() },
    ]);

    // Position breakdown
    const positionCounts = members.reduce((acc, member) => {
      acc[member.position] = (acc[member.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const positionData = Object.entries(positionCounts).map(([position, count]) => ({
      position,
      count: count.toString(),
      percentage: `${Math.round((count / members.length) * 100)}%`,
    }));

    this.addTable(
      [
        { header: 'Position', dataKey: 'position' },
        { header: 'Count', dataKey: 'count' },
        { header: 'Percentage', dataKey: 'percentage' },
      ],
      positionData,
      { title: 'Squad Composition' }
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
        joined: formatDate(member.dateJoined),
      }));

    this.addTable(
      [
        { header: 'Jersey', dataKey: 'jersey' },
        { header: 'Name', dataKey: 'name' },
        { header: 'Position', dataKey: 'position' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'Date Joined', dataKey: 'joined' },
      ],
      memberRows,
      { title: 'Complete Team Roster' }
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
    this.addHeader('Financial Report', `Contributions & Expenses Analysis - ${formatDate(new Date().toISOString())}`);

    // Financial overview
    this.addStatsSection([
      { label: 'Total Income', value: formatUGX(data.totalContributions) },
      { label: 'Total Expenses', value: formatUGX(data.totalExpenses) },
      { label: data.remainingBalance >= 0 ? 'Net Balance' : 'Deficit', value: formatUGX(Math.abs(data.remainingBalance)) },
      { label: 'Transactions', value: (data.contributions.length + data.expenses.length).toString() },
    ]);

    // Contribution analysis
    if (data.contributions.length > 0) {
      const contributionsByType = data.contributions.reduce((acc, contrib) => {
        acc[contrib.type] = (acc[contrib.type] || 0) + (contrib.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      const contributionTypeData = Object.entries(contributionsByType).map(([type, amount]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        amount: formatUGX(amount),
        count: data.contributions.filter(c => c.type === type).length.toString(),
      }));

      this.addTable(
        [
          { header: 'Type', dataKey: 'type' },
          { header: 'Total Amount', dataKey: 'amount' },
          { header: 'Count', dataKey: 'count' },
        ],
        contributionTypeData,
        { title: 'Contributions by Type' }
      );

      // Recent contributions
      const recentContributions = data.contributions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
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

      this.addTable(
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Member', dataKey: 'member' },
          { header: 'Type', dataKey: 'type' },
          { header: 'Amount', dataKey: 'amount' },
          { header: 'Description', dataKey: 'description' },
        ],
        recentContributions,
        { title: 'Recent Contributions' }
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
          { header: 'Category', dataKey: 'category' },
          { header: 'Total Amount', dataKey: 'amount' },
          { header: 'Count', dataKey: 'count' },
          { header: 'Percentage', dataKey: 'percentage' },
        ],
        expenseCategoryData,
        { title: 'Expenses by Category' }
      );

      // Recent expenses
      const recentExpenses = data.expenses
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15)
        .map(expense => ({
          date: formatDate(expense.date),
          category: expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
          amount: formatUGX(expense.amount),
          description: expense.description,
        }));

      this.addTable(
        [
          { header: 'Date', dataKey: 'date' },
          { header: 'Category', dataKey: 'category' },
          { header: 'Amount', dataKey: 'amount' },
          { header: 'Description', dataKey: 'description' },
        ],
        recentExpenses,
        { title: 'Recent Expenses' }
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
    const title = type === 'all' ? 'Events Calendar' : type === 'training' ? 'Training Schedule' : 'Friendly Matches';
    
    this.addHeader(title, `Complete schedule with ${filteredEvents.length} events`);

    // Event statistics
    const upcomingEvents = filteredEvents.filter(e => new Date(e.date) > new Date()).length;
    const pastEvents = filteredEvents.filter(e => new Date(e.date) <= new Date()).length;
    const trainingCount = filteredEvents.filter(e => e.type === 'training').length;
    const friendlyCount = filteredEvents.filter(e => e.type === 'friendly').length;

    const statsData = [
      { label: 'Total Events', value: filteredEvents.length.toString() },
      { label: 'Upcoming', value: upcomingEvents.toString() },
      { label: 'Completed', value: pastEvents.toString() },
    ];

    if (type === 'all') {
      statsData.push({ label: 'Training', value: trainingCount.toString() });
    }

    this.addStatsSection(statsData);

    // Monthly breakdown
    const monthlyBreakdown = filteredEvents.reduce((acc, event) => {
      const month = new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyData = Object.entries(monthlyBreakdown).map(([month, count]) => ({
      month,
      events: count.toString(),
    }));

    this.addTable(
      [
        { header: 'Month', dataKey: 'month' },
        { header: 'Total Events', dataKey: 'events' },
      ],
      monthlyData,
      { title: 'Events by Month' }
    );

    // Complete events list
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

    this.addTable(
      [
        { header: 'Date', dataKey: 'date' },
        { header: 'Time', dataKey: 'time' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Event Details', dataKey: 'description' },
        { header: 'Location', dataKey: 'location' },
        { header: 'Status', dataKey: 'status' },
      ],
      eventRows,
      { title: 'Complete Schedule' }
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
    this.addHeader('Attendance Report', `Comprehensive attendance analysis with ${data.attendanceRecords.length} records`);

    // Attendance statistics
    this.addStatsSection([
      { label: 'Total Sessions', value: data.stats.totalSessions.toString() },
      { label: 'Average Attendance', value: data.stats.averageAttendance.toString() },
      { label: 'Best Attendance', value: data.stats.highestAttendance.toString() },
      { label: 'Lowest Attendance', value: data.stats.lowestAttendance.toString() },
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
        { header: 'Status', dataKey: 'status' },
        { header: 'Count', dataKey: 'count' },
        { header: 'Percentage', dataKey: 'percentage' },
      ],
      statusData,
      { title: 'Attendance by Status' }
    );

    // Detailed attendance records
    const attendanceRows = data.attendanceRecords
      .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
      .slice(0, 50) // Limit to recent 50 records
      .map(record => ({
        date: formatDate(record.event.date),
        event: record.event.type === 'training' ? 'Training' : `vs ${record.event.opponent}`,
        member: record.member.name,
        jersey: `#${record.member.jerseyNumber}`,
        status: record.attendance.status.charAt(0).toUpperCase() + record.attendance.status.slice(1),
        notes: record.attendance.notes || 'No notes',
      }));

    this.addTable(
      [
        { header: 'Date', dataKey: 'date' },
        { header: 'Event', dataKey: 'event' },
        { header: 'Member', dataKey: 'member' },
        { header: 'Jersey', dataKey: 'jersey' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Notes', dataKey: 'notes' },
      ],
      attendanceRows,
      { title: 'Recent Attendance Records' }
    );

    this.save('fitholics-fc-attendance');
  }
}

/**
 * Leadership PDF Export
 */
export class LeadershipPDFExporter extends BasePDFExporter {
  exportLeadership(data: { leadership: Leadership[]; members: Member[] }): void {
    this.addHeader('Leadership Structure', `Organizational chart with ${data.leadership.length} leadership positions`);

    // Leadership statistics
    const activeRoles = data.leadership.filter(l => l.isActive).length;
    const inactiveRoles = data.leadership.filter(l => !l.isActive).length;
    const uniqueLeaders = new Set(data.leadership.map(l => l.memberId)).size;

    this.addStatsSection([
      { label: 'Total Positions', value: data.leadership.length.toString() },
      { label: 'Active Roles', value: activeRoles.toString() },
      { label: 'Inactive Roles', value: inactiveRoles.toString() },
      { label: 'Leaders', value: uniqueLeaders.toString() },
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
      category,
      count: count.toString(),
      percentage: `${Math.round((count / data.leadership.length) * 100)}%`,
    }));

    this.addTable(
      [
        { header: 'Category', dataKey: 'category' },
        { header: 'Count', dataKey: 'count' },
        { header: 'Percentage', dataKey: 'percentage' },
      ],
      categoryData,
      { title: 'Roles by Category' }
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
          startDate: formatDate(leadership.startDate),
          status: leadership.isActive ? 'Active' : 'Inactive',
        };
      });

    this.addTable(
      [
        { header: 'Member', dataKey: 'member' },
        { header: 'Jersey', dataKey: 'jersey' },
        { header: 'Role', dataKey: 'role' },
        { header: 'Category', dataKey: 'category' },
        { header: 'Start Date', dataKey: 'startDate' },
        { header: 'Status', dataKey: 'status' },
      ],
      leadershipRows,
      { title: 'Leadership Directory' }
    );

    this.save('fitholics-fc-leadership');
  }
}