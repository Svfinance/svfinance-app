function TransactionForm({
editingId,
handleSubmit,
description, setDescription,
amount, setAmount,
type, setType,
category, setCategory,
date, setDate,
form,
inputStyle,
card
}){

return(

<div id="transaction-form" style={card}>

  <h3 style={{ marginBottom: "16px" }}>
    {editingId ? "✏️ Editando Transação" : "➕ Nova Transação"}
  </h3>

  <form onSubmit={handleSubmit} style={form}>

    <input
      style={inputStyle}
      placeholder="Descrição"
      value={description}
      onChange={e => setDescription(e.target.value)}
      required
    />

    <input
      style={inputStyle}
      type="number"
      placeholder="Valor"
      value={amount}
      onChange={e => setAmount(e.target.value)}
      required
    />

    <select
      style={inputStyle}
      value={type}
      onChange={e => setType(e.target.value)}
    >
      <option value="income">Entrada</option>
      <option value="expense">Saída</option>
    </select>

    <input
      style={inputStyle}
      placeholder="Categoria"
      value={category}
      onChange={e => setCategory(e.target.value)}
    />

    <input
      style={inputStyle}
      type="date"
      value={date}
      onChange={e => setDate(e.target.value)}
      required
    />

    <button
      type="submit"
      style={{
        background: editingId
          ? "linear-gradient(135deg, #f59e0b, #d97706)"
          : "linear-gradient(135deg, #4f46e5, #6366f1)",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        color: "white",
        cursor: "pointer",
        fontWeight: "600",
        whiteSpace: "nowrap"
      }}
    >
      {editingId ? "Salvar edição" : "Adicionar"}
    </button>

    {editingId && (
      <button
        type="button"
        onClick={() => {
          setDescription("")
          setAmount("")
          setCategory("")
          setDate("")
        }}
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "8px 16px",
          borderRadius: "6px",
          color: "white",
          cursor: "pointer",
          whiteSpace: "nowrap"
        }}
      >
        Cancelar
      </button>
    )}

  </form>

</div>

)

}

export default TransactionForm
