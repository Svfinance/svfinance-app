import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

function MonthlyChart({ monthlyData, card }) {

  // 🔥 NORMALIZA + ORDENA POR DATA
  const data = (monthlyData || [])
    .map(item => ({
      ...item,
      expense: -Math.abs(item.expense || 0),
      income: Math.abs(item.income || 0)
    }))
    .sort((a, b) => a.month.localeCompare(b.month)); // 🔥 resolve bagunça

  return (
    <div style={card}>

      <h3>Fluxo Mensal</h3>

      <ResponsiveContainer width="100%" height={320}>

        <BarChart data={data} barGap={4} barCategoryGap="20%">

          {/* 🔥 GRID (melhora leitura) */}
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

          {/* 🔥 FORMATA MÊS */}
          <XAxis
            dataKey="month"
            tickFormatter={(value) => {
              const [year, month] = value.split("-");
              return `${month}/${year}`;
            }}
          />

          {/* 🔥 CENTRALIZA ZERO */}
          <YAxis />

          <Tooltip
            formatter={(value) =>
              `R$ ${Math.abs(value).toLocaleString("pt-BR", {
                minimumFractionDigits: 2
              })}`
            }
          />

          <Legend />

          {/* 🔥 CORES PROFISSIONAIS */}
          <Bar
            dataKey="income"
            fill="#22c55e"
            name="Entradas"
            radius={[6, 6, 0, 0]}
          />

          <Bar
            dataKey="expense"
            fill="#ef4444"
            name="Saídas"
            radius={[6, 6, 0, 0]}
          />

        </BarChart>

      </ResponsiveContainer>

    </div>
  );
}

export default MonthlyChart;
