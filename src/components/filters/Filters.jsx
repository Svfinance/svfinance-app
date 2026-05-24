function Filters({
filterYear,
setFilterYear,
filterMonth,
setFilterMonth,
filterType,
setFilterType,
clearFilters,
inputStyle
}){

return(

<div style={{display:"flex",gap:"10px",marginBottom:"20px"}}>

<select style={inputStyle} value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
<option value="">Ano</option>
<option value="2026">2026</option>
<option value="2025">2025</option>
</select>

<select style={inputStyle} value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
<option value="">Mês</option>
<option value="01">Jan</option>
<option value="02">Fev</option>
<option value="03">Mar</option>
<option value="04">Abr</option>
<option value="05">Mai</option>
<option value="06">Jun</option>
<option value="07">Jul</option>
<option value="08">Ago</option>
<option value="09">Set</option>
<option value="10">Out</option>
<option value="11">Nov</option>
<option value="12">Dez</option>
</select>

<select style={inputStyle} value={filterType} onChange={e=>setFilterType(e.target.value)}>
<option value="">Tipo</option>
<option value="income">Entrada</option>
<option value="expense">Saída</option>
</select>

<button onClick={clearFilters}>Limpar</button>

</div>

)

}

export default Filters
