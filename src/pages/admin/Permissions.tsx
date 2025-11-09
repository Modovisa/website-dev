import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const Permissions = () => {
  const [selectedRole, setSelectedRole] = useState("admin");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    platform: true,
    billing: false,
    tracking: false,
  });

  const roles = [
    { id: "admin", name: "admin" },
    { id: "finance_admin", name: "finance_admin" },
    { id: "ops_admin", name: "ops_admin" },
    { id: "superadmin", name: "superadmin", badge: "built-in" },
    { id: "support_admin", name: "support_admin" },
  ];

  const permissions = {
    platform: [
      { id: "view_users", label: "View users" },
      { id: "edit_profile", label: "Edit user profile" },
      { id: "deactivate", label: "Deactivate accounts" },
      { id: "block", label: "Block / Unblock" },
      { id: "restore", label: "Restore accounts" },
      { id: "schedule_delete", label: "Schedule hard delete" },
      { id: "hard_delete", label: "Hard delete accounts" },
    ],
    billing: [
      { id: "view_subs", label: "View subscriptions" },
      { id: "cancel_subs", label: "Cancel subscriptions" },
      { id: "issue_refunds", label: "Issue refunds" },
    ],
    tracking: [
      { id: "view_configs", label: "View tracking configs" },
      { id: "create_configs", label: "Create / edit configs" },
      { id: "delete_configs", label: "Delete configs" },
    ],
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground">Control who can manage users, billing, tracking, and more.</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Default Permissions
          </Button>
          <Button>
            + New Role
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Roles List */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Roles</h3>
                  <Badge variant="secondary">5</Badge>
                </div>
                
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input placeholder="Search roles..." className="pl-9" />
                </div>

                <div className="space-y-1">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                        selectedRole === role.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="text-sm">{role.name}</span>
                      {role.badge && (
                        <Badge variant="secondary" className="text-xs">{role.badge}</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="lg:col-span-6">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Permissions</h3>
                  <Input placeholder="Filter permissions... (e.g. user, billing)" className="w-80" />
                  <Button variant="link" className="text-primary">Clear</Button>
                </div>

                {/* Platform Users Section */}
                <div className="border rounded-lg">
                  <button
                    onClick={() => toggleSection('platform')}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <h4 className="font-medium">Platform Users</h4>
                    {expandedSections.platform ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedSections.platform && (
                    <div className="p-4 pt-0 space-y-3">
                      {permissions.platform.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox id={perm.id} />
                          <label htmlFor={perm.id} className="text-sm cursor-pointer">
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Billing Section */}
                <div className="border rounded-lg">
                  <button
                    onClick={() => toggleSection('billing')}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <h4 className="font-medium">Billing</h4>
                    {expandedSections.billing ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedSections.billing && (
                    <div className="p-4 pt-0 space-y-3">
                      {permissions.billing.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox id={perm.id} />
                          <label htmlFor={perm.id} className="text-sm cursor-pointer">
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tracking Section */}
                <div className="border rounded-lg">
                  <button
                    onClick={() => toggleSection('tracking')}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <h4 className="font-medium">Tracking</h4>
                    {expandedSections.tracking ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  {expandedSections.tracking && (
                    <div className="p-4 pt-0 space-y-3">
                      {permissions.tracking.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox id={perm.id} />
                          <label htmlFor={perm.id} className="text-sm cursor-pointer">
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Role
                    </Button>
                    <Button variant="outline">
                      + Add Role
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost">Revert</Button>
                    <Button>
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">No changes.</p>
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Members</h3>
                <p className="text-sm text-muted-foreground">Admins assigned to this role.</p>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add by email</label>
                  <div className="flex gap-2">
                    <Input placeholder="admin@example.com" />
                    <Button>Add</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">User must exist in <span className="text-primary">admin_users</span>.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Changes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Changes</CardTitle>
              <Select>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Last 24h" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-3 text-sm font-semibold text-muted-foreground">WHEN</th>
                    <th className="pb-3 text-sm font-semibold text-muted-foreground">ADMIN</th>
                    <th className="pb-3 text-sm font-semibold text-muted-foreground">ACTION</th>
                    <th className="pb-3 text-sm font-semibold text-muted-foreground">TARGET</th>
                    <th className="pb-3 text-sm font-semibold text-muted-foreground">DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No recent changes in the selected timeframe
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

function Select({ children, ...props }: any) {
  return <select className="border rounded px-3 py-1.5 text-sm" {...props}>{children}</select>;
}

function SelectTrigger({ children, className }: any) {
  return <div className={className}>{children}</div>;
}

function SelectValue({ placeholder }: any) {
  return <span>{placeholder}</span>;
}

function SelectContent({ children }: any) {
  return <>{children}</>;
}

function SelectItem({ children, value }: any) {
  return <option value={value}>{children}</option>;
}

export default Permissions;
