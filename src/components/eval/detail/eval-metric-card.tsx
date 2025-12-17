import { Card, CardContent } from "ui/card";
import { cn } from "lib/utils";
import {
  FileTextIcon,
  ClockIcon,
  TrendingUpIcon,
  CheckCircleIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface EvalMetricCardProps {
  title: string;
  value: number | string;
  icon: "file" | "clock" | "trend" | "check";
  suffix?: string;
  prefix?: string;
  description?: string;
  isDecimal?: boolean;
}

export function EvalMetricCard({
  title,
  value,
  icon,
  suffix = "",
  prefix = "",
  description,
  isDecimal = false,
}: EvalMetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === "string") return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const getIcon = () => {
    const iconConfig = {
      file: <FileTextIcon className="text-white w-7 h-7" />,
      clock: <ClockIcon className="text-white w-7 h-7" />,
      trend: <TrendingUpIcon className="text-white w-7 h-7" />,
      check: <CheckCircleIcon className="text-white w-7 h-7" />,
    };

    return iconConfig[icon];
  };

  const formatValue = (val: number | string) => {
    if (typeof val === "string") return val;

    const numValue = typeof val === "number" ? val : displayValue;

    if (isDecimal) {
      return numValue.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    }

    return Math.floor(numValue).toLocaleString();
  };

  // Dynamic font size based on content length
  const getValueFontSize = () => {
    const valueStr = typeof value === "string" ? value : formatValue(value);
    if (valueStr.length > 12) return "text-lg"; // Very long strings
    if (valueStr.length > 8) return "text-xl"; // Long strings
    if (valueStr.length > 5) return "text-2xl"; // Medium strings
    return "text-3xl"; // Default/short strings
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "bg-card border-border",
          "hover:bg-input transition-colors",
          "hover:shadow-lg hover:shadow-primary/5",
          "relative overflow-hidden group",
        )}
      >
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-primary text-sm font-serif mb-2">{title}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-muted-foreground text-sm">{prefix}</span>
                <p
                  className={`font-mono text-foreground font-bold ${getValueFontSize()}`}
                >
                  {formatValue(value)}
                </p>
                <span className="text-accent-foreground text-lg font-medium">
                  {suffix}
                </span>
              </div>
              {description && (
                <p className="text-muted-foreground text-xs mt-2">
                  {description}
                </p>
              )}
            </div>

            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                "bg-gradient-to-r from-primary to-primary/80",
                "shadow-lg shadow-primary/20",
                "flex-shrink-0 ml-4",
              )}
            >
              {getIcon()}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
