import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface TrendChartProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  color?: string;
}

const TrendChart = ({ title, data, color = "hsl(230, 25%, 45%)" }: TrendChartProps) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
        {title}
      </h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(230, 10%, 50%)' }}
            />
            <YAxis 
              hide 
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendChart;
