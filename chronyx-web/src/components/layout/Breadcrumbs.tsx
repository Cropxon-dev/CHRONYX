import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const routeLabels: Record<string, string> = {
  app: "Dashboard",
  todos: "Tasks",
  study: "Study",
  loans: "Loans",
  insurance: "Insurance",
  expenses: "Expenses",
  income: "Income",
  reports: "Reports",
  lifespan: "Lifespan",
  achievements: "Achievements",
  activity: "Activity",
  settings: "Settings",
  memory: "Memory",
  timeline: "Timeline",
  search: "Search",
  backup: "Backup",
  documents: "Documents",
  social: "Social",
};

const Breadcrumbs = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on root app route
  if (pathSegments.length <= 1) {
    return null;
  }

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === pathSegments.length - 1;

    return { path, label, isLast };
  });

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
      aria-label="Breadcrumb"
    >
      <Link
        to="/app"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>

      {breadcrumbs.slice(1).map((crumb, index) => (
        <motion.div
          key={crumb.path}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-1"
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </motion.div>
      ))}
    </motion.nav>
  );
};

export default Breadcrumbs;
