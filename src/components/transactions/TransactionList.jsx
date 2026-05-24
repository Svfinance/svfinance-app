function TransactionList({
filtered,
editTransaction,
deleteTransaction,
row,
editBtn,
deleteBtn,
card
}){

const handleEdit = (t) => {
  editTransaction(t)
  // Scroll suave até o formulário
  setTimeout(() => {
    const form = document.getElementById("transaction-form")
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, 100)
}

return(

<div style={card}>

<h3>Transações</h3>

{filtered.length === 0 && (
  <p style={{ color: "#64748b", fontSize: "14px", marginTop: "10px" }}>
    Nenhuma transação encontrada.
  </p>
)}

{filtered.map(t=>(

<div key={t.id} style={row}>

<span>{t.description}</span>
<span>{t.category}</span>
<span>{t.date}</span>

<span style={{color:t.type==="income"?"#00ff88":"#ff4d4d"}}>
{t.type==="expense"?"-":"+"} R$ {t.amount}
</span>

<button style={editBtn} onClick={() => handleEdit(t)}>Editar</button>

<button style={deleteBtn} onClick={()=>deleteTransaction(t.id)}>Excluir</button>

</div>

))}

</div>

)

}

export default TransactionList
