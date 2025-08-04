@@ .. @@
-const Contributions: React.FC = () => {
}
+const Transactions: React.FC = () => {
   const { user } = useAuth();
   const [members, setMembers] = useState<Member[]>([]);
   const [contributions, setContributions] = useState<Contribution[]>([]);
   const [expenses, setExpenses] = useState<Expense[]>([]);
}
@@ .. @@
   const canCreateTransaction = user && canUserAccess(user.role, Permissions.CREATE_CONTRIBUTION);
   const canEditTransaction = user && canUserAccess(user.role, Permissions.EDIT_CONTRIBUTION);
   const canDeleteTransaction = user && canUserAccess(user.role, Permissions.DELETE_CONTRIBUTION);
   const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);
@@ .. @@
     <div>
       <PageHeader
-        title="Contributions & Expenses"
+        title="Transactions"
-        description={`Track team contributions and expenses in UGX (${filteredTransactions.length} transactions)`}
+        description={`Track team contributions and expenses in UGX (${filteredTransactions.length} transactions)`}
         actions={
           <div className="flex space-x-2">
             {canCreateTransaction && (
               <>
                 <Button 
                   onClick={handleCreateContribution} 
                   leftIcon={<Plus size={18} />}
                   className="bg-green-600 hover:bg-green-700 text-white"
                 >
                   Add Contribution
                 </Button>
@@ .. @@
-export default Contributions;
+export default Transactions;
           )
           }
         }