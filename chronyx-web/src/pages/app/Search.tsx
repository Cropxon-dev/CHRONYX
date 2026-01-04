import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search as SearchIcon, 
  FileText, 
  Image, 
  BookOpen, 
  Wallet, 
  Shield, 
  Activity,
  Calendar,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface SearchResult {
  id: string;
  title: string;
  module: string;
  date: string;
  link: string;
  snippet?: string;
}

const Search = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search
  useState(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["global-search", debouncedQuery, user?.id],
    queryFn: async () => {
      if (!debouncedQuery.trim() || !user) return [];
      
      const searchTerm = `%${debouncedQuery.toLowerCase()}%`;
      const allResults: SearchResult[] = [];

      // Search memories
      const { data: memories } = await supabase
        .from("memories")
        .select("id, title, description, file_name, created_date")
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},file_name.ilike.${searchTerm}`)
        .limit(10);
      
      memories?.forEach(m => {
        allResults.push({
          id: m.id,
          title: m.title || m.file_name,
          module: "Memories",
          date: m.created_date,
          link: "/app/memory",
          snippet: m.description || undefined,
        });
      });

      // Search study topics
      const { data: topics } = await supabase
        .from("syllabus_topics")
        .select("id, subject, chapter_name, topic_name, notes, created_at")
        .or(`subject.ilike.${searchTerm},chapter_name.ilike.${searchTerm},topic_name.ilike.${searchTerm},notes.ilike.${searchTerm}`)
        .limit(10);
      
      topics?.forEach(t => {
        allResults.push({
          id: t.id,
          title: `${t.subject} - ${t.topic_name}`,
          module: "Study",
          date: t.created_at?.split("T")[0] || "",
          link: "/app/study",
          snippet: t.chapter_name,
        });
      });

      // Search expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, category, notes, expense_date, amount")
        .or(`category.ilike.${searchTerm},notes.ilike.${searchTerm}`)
        .limit(10);
      
      expenses?.forEach(e => {
        allResults.push({
          id: e.id,
          title: `${e.category} - ₹${e.amount}`,
          module: "Expenses",
          date: e.expense_date,
          link: "/app/expenses",
          snippet: e.notes || undefined,
        });
      });

      // Search income
      const { data: income } = await supabase
        .from("income_entries")
        .select("id, notes, income_date, amount, income_sources(source_name)")
        .or(`notes.ilike.${searchTerm}`)
        .limit(10);
      
      income?.forEach(i => {
        const sourceName = (i.income_sources as any)?.source_name;
        allResults.push({
          id: i.id,
          title: sourceName ? `${sourceName} - ₹${i.amount}` : `Income - ₹${i.amount}`,
          module: "Income",
          date: i.income_date,
          link: "/app/income",
          snippet: i.notes || undefined,
        });
      });

      // Search loans
      const { data: loans } = await supabase
        .from("loans")
        .select("id, bank_name, loan_type, loan_account_number, notes, start_date")
        .or(`bank_name.ilike.${searchTerm},loan_type.ilike.${searchTerm},loan_account_number.ilike.${searchTerm},notes.ilike.${searchTerm}`)
        .limit(10);
      
      loans?.forEach(l => {
        allResults.push({
          id: l.id,
          title: `${l.bank_name} - ${l.loan_type}`,
          module: "Loans",
          date: l.start_date,
          link: "/app/loans",
          snippet: l.notes || undefined,
        });
      });

      // Search insurance
      const { data: insurances } = await supabase
        .from("insurances")
        .select("id, policy_name, provider, policy_number, notes, start_date")
        .or(`policy_name.ilike.${searchTerm},provider.ilike.${searchTerm},policy_number.ilike.${searchTerm},notes.ilike.${searchTerm}`)
        .limit(10);
      
      insurances?.forEach(ins => {
        allResults.push({
          id: ins.id,
          title: `${ins.policy_name} - ${ins.provider}`,
          module: "Insurance",
          date: ins.start_date,
          link: "/app/insurance",
          snippet: ins.notes || undefined,
        });
      });

      // Search todos
      const { data: todos } = await supabase
        .from("todos")
        .select("id, text, date, status")
        .ilike("text", searchTerm)
        .limit(10);
      
      todos?.forEach(t => {
        allResults.push({
          id: t.id,
          title: t.text,
          module: "Todos",
          date: t.date,
          link: "/app/todos",
          snippet: `Status: ${t.status}`,
        });
      });

      // Search achievements
      const { data: achievements } = await supabase
        .from("achievements")
        .select("id, title, description, category, achieved_at")
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(10);
      
      achievements?.forEach(a => {
        allResults.push({
          id: a.id,
          title: a.title,
          module: "Achievements",
          date: a.achieved_at,
          link: "/app/achievements",
          snippet: a.description || undefined,
        });
      });

      // Search activity logs
      const { data: activities } = await supabase
        .from("activity_logs")
        .select("id, action, module, created_at")
        .or(`action.ilike.${searchTerm},module.ilike.${searchTerm}`)
        .limit(10);
      
      activities?.forEach(a => {
        allResults.push({
          id: a.id,
          title: a.action,
          module: "Activity",
          date: a.created_at?.split("T")[0] || "",
          link: "/app/activity",
          snippet: `Module: ${a.module}`,
        });
      });

      // Sort by date descending
      return allResults.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    enabled: !!debouncedQuery.trim() && !!user,
  });

  // Group results by module
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.module]) acc[result.module] = [];
    acc[result.module].push(result);
    return acc;
  }, {});

  const getModuleIcon = (module: string) => {
    switch (module) {
      case "Memories": return <Image className="w-4 h-4" />;
      case "Study": return <BookOpen className="w-4 h-4" />;
      case "Expenses":
      case "Income":
      case "Loans": return <Wallet className="w-4 h-4" />;
      case "Insurance": return <Shield className="w-4 h-4" />;
      case "Activity": return <Activity className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Find anything across your life system</p>
      </header>

      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search memories, documents, finances, study..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDebouncedQuery(e.target.value);
          }}
          className="pl-10 h-12 text-lg"
          autoFocus
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : query && results.length === 0 ? (
        <div className="text-center py-12">
          <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No results found for "{query}"</p>
        </div>
      ) : Object.keys(groupedResults).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedResults).map(([module, moduleResults]) => (
            <div key={module}>
              <div className="flex items-center gap-2 mb-3">
                {getModuleIcon(module)}
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {module}
                </h2>
                <span className="text-xs text-muted-foreground">({moduleResults.length})</span>
              </div>
              <div className="space-y-2">
                {moduleResults.map((result) => (
                  <Link key={result.id} to={result.link}>
                    <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.title}</p>
                            {result.snippet && (
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {result.snippet}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            {result.date}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !query ? (
        <div className="text-center py-12">
          <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Start typing to search across all modules</p>
        </div>
      ) : null}
    </div>
  );
};

export default Search;
