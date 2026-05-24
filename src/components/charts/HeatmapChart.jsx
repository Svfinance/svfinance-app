function HeatmapChart({transactions,card}){

const map={}

transactions.forEach(t=>{

if(!t.date) return

const d=t.date

if(!map[d]) map[d]=0

map[d]+=t.amount

})

const days=Object.keys(map)

return(

<div style={card}>

<h3>Mapa de Gastos</h3>

<div
style={{
display:"grid",
gridTemplateColumns:"repeat(7,1fr)",
gap:"6px",
marginTop:"15px"
}}
>

{days.map(day=>{

const value=map[day]

let color="#1e293b"

if(value>50) color="#16a34a"
if(value>200) color="#eab308"
if(value>500) color="#dc2626"

return(

<div
key={day}
title={`${day} R$ ${value}`}
style={{
height:"30px",
borderRadius:"4px",
background:color
}}
/>

)

})}

</div>

</div>

)

}

export default HeatmapChart
