import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, FileWarning, Bell } from "lucide-react";
import FamilyMembers from "@/components/insurance/FamilyMembers";
import ClaimsList from "@/components/insurance/ClaimsList";
import PoliciesList from "@/components/insurance/PoliciesList";
import TestReminderButtons from "@/components/reminders/TestReminderButtons";

const Insurance = () => {
  const [activeTab, setActiveTab] = useState("policies");

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Insurance</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage policies, family members and claims</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="family" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Family
          </TabsTrigger>
          <TabsTrigger value="claims" className="flex items-center gap-2">
            <FileWarning className="w-4 h-4" />
            Claims
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-6">
          <PoliciesList />
        </TabsContent>

        <TabsContent value="family" className="mt-6">
          <FamilyMembers />
        </TabsContent>

        <TabsContent value="claims" className="mt-6">
          <ClaimsList />
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <TestReminderButtons />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Insurance;
