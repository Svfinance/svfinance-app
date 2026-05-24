import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

function CategoryChart({ chartData, card }) {

  // 🔥 garante valores positivos
  const data = (chartData || []).map(item => ({
    ...item,
    value: Math.abs(item.value)
  }));

  // 🎨 PALETA PROFISSIONAL (estilo fintech)
  const COLORS = [
    "#22c55e", // verde
    "#3b82f6", // azul
    "#a855f7", // roxo
    "#06b6d4", // ciano
    "#eab308", // amarelo suave
    "#ef4444"  // vermelho
  ];

  return (
    <div style={card}>

      <h3>Gastos por Categoria</h3>

      <ResponsiveContainer width="100%" height={320}>

        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={50} // 🔥 efeito donut (mais moderno)
            paddingAngle={3}
            label={({ name, percent }) =>
              `${name} (${(percent * 100).toFixed(0)}%)`
            }
          >

            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}

          </Pie>

          <Tooltip
            formatter={(value) =>
              `R$ ${value.toLocaleString("pt-BR", {
                minimumFractionDigits: 2
              })}`
            }
          />

          <Legend />

        </PieChart>

      </ResponsiveContainer>

    </div>
  );
}

export default CategoryChart;
