document.addEventListener("DOMContentLoaded", () => {
  const inputsParaRecalculo = [
    "credito",
    "taxa-adm",
    "qtd-meses",
    "qtd-parc-pagas",
    "perc-lance-ofertado",
    "diluir-lance",
    "redutor-opc",
    "tipo-seguro",
    "perc-lance-embutido", // Adicionado para recalculo
  ];

  inputsParaRecalculo.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      // Usa 'input' para inputs de texto e 'change' para select ou inputs que podem ser alterados rapidamente
      element.addEventListener("input", calcularSimulacao);
      // Para alguns inputs como 'diluir-lance' que são number/select, 'change' também é útil
      if (element.type !== 'text') {
        element.addEventListener("change", calcularSimulacao);
      }
    }
  });

  calcularSimulacao();
});

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function parseInput(valorStr) {
  if (typeof valorStr !== 'string') return 0;

  // Remove pontos, R$, $, %
  let cleaned = valorStr
    .replace(/[R$%.]/g, "")
    .trim();

  // Substitui vírgula por ponto para o parseFloat
  cleaned = cleaned.replace(",", ".");

  return parseFloat(cleaned) || 0;
}

// Nova função para extrair o valor de porcentagem, tratando o símbolo '%'
function parsePercent(valorStr) {
  const value = parseInput(valorStr);
  // Se a string original contém '%', assume-se que já é o valor percentual (ex: "17%" -> 17)
  return valorStr.includes('%') ? value / 100 : value / 100;
}

function calcularSimulacao() {
  const credito = parseInput(document.getElementById("credito").value);
  // Usando a nova função para tratar a porcentagem
  const taxaAdm = parsePercent(document.getElementById("taxa-adm").value);
  const qtdMeses = parseInt(document.getElementById("qtd-meses").value) || 0;
  const qtdParcelasPagas =
    parseInt(document.getElementById("qtd-parc-pagas").value) || 0;
  // Usando a nova função para tratar a porcentagem
  const percLanceOfertado =
    parsePercent(document.getElementById("perc-lance-ofertado").value);

  // O input 'diluir-lance' é um 'number', seu valor é uma string que deve ser comparada com "1"
  const diluirLance = document.getElementById("diluir-lance").value === "1";
  
  // Usando a nova função para tratar a porcentagem
  const percRedutor =
    parsePercent(document.getElementById("redutor-opc")?.value);
  
  // Usando a nova função para tratar a porcentagem do lance embutido
  const percLanceEmbutido = 
    parsePercent(document.getElementById("perc-lance-embutido")?.value);
  
  // O tipo-seguro não é usado no cálculo, mantendo a variável de seguro
  // const tipoSeguro = parseInt(document.getElementById("tipo-seguro")?.value) || 1;
  
  // --- Valores Fixos/Parâmetros ---
  const taxaSeguroMensal = 0.0004; // 0.04%
  const valorSeguroMensal = credito * taxaSeguroMensal;

  // --- Saldo Devedor Total (Crédito + Taxa Adm) ---
  const saldoDevedorTotal = credito * (1 + taxaAdm);
  const valorParcelaIntegral = qtdMeses > 0 ? saldoDevedorTotal / qtdMeses : 0;

  // --- Redutor/Flex (Pré-Contemplação) ---
  const valorParcelaFlex = valorParcelaIntegral * (1 - percRedutor);
  const valorResidualPorMes = valorParcelaIntegral * percRedutor;
  const saldoResidualAcumulado = valorResidualPorMes * qtdParcelasPagas;

  // Atualiza label do redutor
  const redutorLabel = document.getElementById("redutor-label");
  if (redutorLabel) {
    // Exibe a porcentagem que foi usada no cálculo, formatada
    const percRedutorFormatado = (percRedutor * 100).toFixed(0);
    redutorLabel.value = `${percRedutorFormatado}%`;
  }

  // Atualiza Saldo Devedor Inicial
  document.getElementById("saldo-devedor-inicial").value =
    formatarMoeda(saldoDevedorTotal);

  // Atualiza Valor da Parcela Base (Flex ou Integral + Seguro)
  const parcelaParaExibir =
    percRedutor > 0 ? valorParcelaFlex : valorParcelaIntegral;
  document.getElementById("valor-parcela-base").value = formatarMoeda(
    parcelaParaExibir + valorSeguroMensal
  );

  // --- Cálculo do Lance ---
  const valorLanceEmbutido = credito * percLanceEmbutido;
  const valorLanceLivre = credito * percLanceOfertado;
  
  // O valor total do lance ofertado é a soma do Lance Livre + Lance Embutido
  const valorLanceTotal = valorLanceLivre + valorLanceEmbutido;
  
  // O saldo devedor inicial é reduzido pelo valor total do lance
  let saldoDevedorParaQuitar = saldoDevedorTotal - valorLanceTotal;

  // O saldo residual acumulado é somado ao saldo devedor
  saldoDevedorParaQuitar += saldoResidualAcumulado;

  // --- Atualiza Dados do Lance ---
  document.getElementById("valor-lance-ofertado").value =
    formatarMoeda(valorLanceTotal); // Valor Total (Livre + Embutido)
  
  // Atualiza a exibição do Lance Embutido (somente o valor)
  const inputValorLanceEmbutido = document.querySelector("#valor-lance-embutido input");
  if (inputValorLanceEmbutido) {
    inputValorLanceEmbutido.value = formatarMoeda(valorLanceEmbutido);
  }

  // Atualiza o Saldo Devedor Final
  document.getElementById("saldo-devedor-final").textContent = formatarMoeda(
    saldoDevedorParaQuitar
  );
  
  // Atualiza a label Diluir Lance
  document.getElementById("diluir-lance-label").textContent = diluirLance
    ? "Sim (Reduz Parcela)"
    : "Não (Abate Prazo)";
  
  // --- Cálculo Pós-Contemplação ---
  const prazoRestanteInicial = qtdMeses - qtdParcelasPagas;

  let parcelasAPagar;
  let valorParcelaFinalSemSeguro;
  
  // Lógica de Diluição
  if (diluirLance) {
    // Diluir Lance: Prazo não muda, Parcela reduz
    parcelasAPagar = prazoRestanteInicial;
    valorParcelaFinalSemSeguro =
      parcelasAPagar > 0 ? saldoDevedorParaQuitar / parcelasAPagar : 0;
  } else {
    // Abater Prazo: Parcela não muda, Prazo reduz
    // A parcela pós-contemplação volta a ser a parcela cheia (integral)
    const parcelaCheiaPosContemplacao = valorParcelaIntegral;
    valorParcelaFinalSemSeguro = parcelaCheiaPosContemplacao;
    
    // Calcula o novo prazo, arredondando para cima
    parcelasAPagar =
      valorParcelaFinalSemSeguro > 0
        ? Math.ceil(saldoDevedorParaQuitar / valorParcelaFinalSemSeguro)
        : 0;
  }

  // Soma o seguro à parcela final
  const valorParcelaFinalCOMSEGURO =
    valorParcelaFinalSemSeguro + valorSeguroMensal;

  // --- Atualiza Resultados Finais ---
  
  // Qtd. de parcelas a pagar
  document.getElementById("parc-a-pagar-qtd").value = parcelasAPagar;
  
  // Valor da Parcela a pagar (com seguro)
  document.getElementById("parc-a-pagar-valor").value = formatarMoeda(
    valorParcelaFinalCOMSEGURO
  );

  // Qtd. de parcelas abatidas (apenas relevante para "Abate Prazo")
  // Calculado pelo valor total do lance / valor da parcela integral
  const qtdParcelasAbatidas =
    valorParcelaIntegral > 0 ? valorLanceTotal / valorParcelaIntegral : 0;
  
  // Qtd. de parcelas abatidas
  document.getElementById("qtd-parc-abatidas").value =
    qtdParcelasAbatidas.toFixed(2);

  // Crédito disponível
  // O crédito disponível é o crédito contratado menos o valor do lance embutido
  const creditoDisponivel = credito - valorLanceEmbutido;
  document.querySelector(".lance-contemplacao .info-line:last-child input").value = formatarMoeda(creditoDisponivel);
}