import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector, PieProps } from 'recharts';
import Card from '../../components/ui/Card';
import { PerformanceTier } from '../../types';

interface SchoolPerformanceChartsProps {
  gradeData: { name: string; average: number }[];
  subjectData: { name: string; average: number }[];
  pieData: { name: string; value: number }[];
}

const COLORS = {
  [PerformanceTier.MASTERED]: '#2E7D32',
  [PerformanceTier.DEVELOPING]: '#F9A826',
  [PerformanceTier.NEEDS_SUPPORT]: '#D44D5C',
};

// Extend PieProps to include properties that are missing in the installed @types/recharts version.
interface FixPieProps extends PieProps {
  activeIndex?: number;
  activeShape?: React.ReactElement | ((props: any) => React.ReactElement) | any;
  onMouseEnter?: (data: any, index: number) => void;
}

const FixedPie = Pie as React.FC<FixPieProps>;

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${value} Students`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(Rate ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


const SchoolPerformanceCharts: React.FC<SchoolPerformanceChartsProps> = ({ gradeData, subjectData, pieData }) => {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="text-xl font-bold text-royal-blue mb-4">Average Scores by Grade</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average" fill="#0033A0" name="Average Score %" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
             <Card>
                <h3 className="text-xl font-bold text-royal-blue mb-4">Average Scores by Subject</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subjectData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average" fill="#D4AF37" name="Average Score %" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>
            <Card>
                <h3 className="text-xl font-bold text-royal-blue mb-4">School-Wide Performance Tiers</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <FixedPie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            onMouseEnter={onPieEnter}
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as PerformanceTier]} />
                            ))}
                        </FixedPie>
                    </PieChart>
                </ResponsiveContainer>
            </Card>
        </div>
    );
};

export default SchoolPerformanceCharts;