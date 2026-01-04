import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  GraduationCap, 
  Briefcase, 
  IndianRupee,
  Plus,
  FolderOpen
} from "lucide-react";
import IdentityDocuments from "@/components/documents/IdentityDocuments";
import EducationRecords from "@/components/documents/EducationRecords";
import WorkHistory from "@/components/documents/WorkHistory";
import LifetimeEarnings from "@/components/documents/LifetimeEarnings";

const Documents = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("identity");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-light tracking-tight text-foreground mb-2">
            Personal Documents & Career Vault
          </h1>
          <p className="text-muted-foreground text-sm">
            Your private archive for identity, education, and career records
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 h-auto p-1 bg-muted/50">
            <TabsTrigger 
              value="identity" 
              className="flex items-center gap-2 py-3 data-[state=active]:bg-background"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Identity</span>
            </TabsTrigger>
            <TabsTrigger 
              value="education"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-background"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Education</span>
            </TabsTrigger>
            <TabsTrigger 
              value="work"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-background"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Work & Career</span>
            </TabsTrigger>
            <TabsTrigger 
              value="earnings"
              className="flex items-center gap-2 py-3 data-[state=active]:bg-background"
            >
              <IndianRupee className="h-4 w-4" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="mt-6">
            <IdentityDocuments />
          </TabsContent>

          <TabsContent value="education" className="mt-6">
            <EducationRecords />
          </TabsContent>

          <TabsContent value="work" className="mt-6">
            <WorkHistory />
          </TabsContent>

          <TabsContent value="earnings" className="mt-6">
            <LifetimeEarnings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Documents;
