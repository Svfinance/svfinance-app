function TransactionsTable({ transactions }) {

  return (

    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">

      <h2 className="text-xl font-semibold mb-6">
        Transações
      </h2>

      <table className="w-full text-left">

        <thead className="text-gray-400 border-b border-white/10">
          <tr>
            <th className="pb-3">Descrição</th>
            <th className="pb-3">Valor</th>
          </tr>
        </thead>

        <tbody>

          {transactions.map(t => (

            <tr key={t.id} className="border-b border-white/10">

              <td className="py-3">
                {t.descricao}
              </td>

              <td className={`py-3 font-semibold ${t.valor > 0 ? "text-green-400" : "text-red-400"}`}>
                R$ {t.valor}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  )

}

export default TransactionsTable
