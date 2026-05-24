import {
LineChart,
Line,
CartesianGrid,
XAxis,
YAxis,
Tooltip,
ResponsiveContainer
} from "recharts";

function BalanceChart({data,card}){

// 🔥 verifica se saldo final é positivo ou negativo
const lastBalance = data.length > 0 ? data[data.length - 1].balance : 0;

const color = lastBalance >= 0 ? "#00ff88" : "#ff4d4d";

return(

<div style={card}>

<h3>Evolução do Saldo</h3>

<ResponsiveContainer width="100%" height={300}>

<LineChart data={data}>

<CartesianGrid stroke="#334155"/>

<XAxis dataKey="date"/>

<YAxis/>

<Tooltip formatter={(value)=>`R$ ${value}`} />

<Line
type="monotone"
dataKey="balance"
stroke={color}
strokeWidth={3}
/>

</LineChart>

</ResponsiveContainer>

</div>

)

}

export default BalanceChart;
