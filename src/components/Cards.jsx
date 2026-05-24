function Cards({ saldo, receitas, despesas }) {

  return (

    <div className="grid grid-cols-3 gap-6 mb-10">

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-xl">
        <p className="text-gray-400">Saldo</p>
        <h2 className="text-2xl font-bold text-green-400">
          R$ {saldo}
        </h2>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-xl">
        <p className="text-gray-400">Receitas</p>
        <h2 className="text-2xl font-bold text-blue-400">
          R$ {receitas}
        </h2>
      </div>

      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-xl">
        <p className="text-gray-400">Despesas</p>
        <h2 className="text-2xl font-bold text-red-400">
          R$ {despesas}
        </h2>
      </div>

    </div>

  )

}

export default Cards
