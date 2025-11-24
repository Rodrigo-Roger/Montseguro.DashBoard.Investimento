document.addEventListener("DOMContentLoaded", () => {
  const inputsParaRecalculo = [
    "credito",
    "taxa-adm",
    "qtd-meses",
    "qtd-parc-pagas",
    "perc-lance-ofertado",
    "diluir-lance",
    "redutor-opc",
    "perc-lance-embutido",
    "seguro-ativo",
  ];

  inputsParaRecalculo.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("input", calcularSimulacao);
      if (element.type !== "text") {
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
  if (typeof valorStr !== "string") return 0;

  let cleaned = valorStr.replace(/[R$%.]/g, "").trim();

  cleaned = cleaned.replace(",", ".");

  return parseFloat(cleaned) || 0;
}

function parsePercent(valorStr) {
  const value = parseInput(valorStr);
  return valorStr.includes("%") ? value / 100 : value / 100;
}

function calcularSimulacao() {
  const credito = parseInput(document.getElementById("credito").value);
  const taxaAdm = parsePercent(document.getElementById("taxa-adm").value);
  const qtdMeses = parseInt(document.getElementById("qtd-meses").value) || 0;
  const qtdParcelasPagas =
    parseInt(document.getElementById("qtd-parc-pagas").value) || 0;
  const percLanceOfertado = parsePercent(
    document.getElementById("perc-lance-ofertado").value
  );
  const diluirLance = document.getElementById("diluir-lance").value === "1";
  const percRedutor = parsePercent(document.getElementById("redutor-opc")?.value);
  const percLanceEmbutido = parsePercent(
    document.getElementById("perc-lance-embutido")?.value
  );
  const seguroAtivo = document.getElementById("seguro-ativo")?.value === "1";
  
  const taxaSeguroMensal = 0.0004;
  const valorSeguroMensal = seguroAtivo ? credito * taxaSeguroMensal : 0;

  const saldoDevedorTotal = credito * (1 + taxaAdm);
  const valorParcelaIntegral = qtdMeses > 0 ? saldoDevedorTotal / qtdMeses : 0;

  const valorParcelaFlex = valorParcelaIntegral * (1 - percRedutor);
  const valorResidualPorMes = valorParcelaIntegral * percRedutor;
  const saldoResidualAcumulado = valorResidualPorMes * qtdParcelasPagas;

  const redutorLabel = document.getElementById("redutor-label");
  if (redutorLabel) {
    const percRedutorFormatado = (percRedutor * 100).toFixed(0);
    redutorLabel.value = `${percRedutorFormatado}%`;
  }

  document.getElementById("saldo-devedor-inicial").value =
    formatarMoeda(saldoDevedorTotal);

  const parcelaParaExibir =
    percRedutor > 0 ? valorParcelaFlex : valorParcelaIntegral;
  document.getElementById("valor-parcela-base").value = formatarMoeda(
    parcelaParaExibir + valorSeguroMensal
  );

  const valorLanceEmbutido = credito * percLanceEmbutido;
  const valorLanceLivre = credito * percLanceOfertado;
  const valorLanceTotal = valorLanceLivre + valorLanceEmbutido;
  
  let saldoDevedorParaQuitar = saldoDevedorTotal - valorLanceTotal;
  saldoDevedorParaQuitar += saldoResidualAcumulado;

  document.getElementById("valor-lance-ofertado").value =
    formatarMoeda(valorLanceTotal);
  
  const inputValorLanceEmbutido = document.querySelector("#valor-lance-embutido input");
  if (inputValorLanceEmbutido) {
    inputValorLanceEmbutido.value = formatarMoeda(valorLanceEmbutido);
  }

  document.getElementById("saldo-devedor-final").textContent = formatarMoeda(
    saldoDevedorParaQuitar
  );
  
  document.getElementById("diluir-lance-label").textContent = diluirLance
    ? "Sim (Reduz Parcela)"
    : "Não (Abate Prazo)";
  
  const prazoRestanteInicial = qtdMeses - qtdParcelasPagas;

  let parcelasAPagar;
  let valorParcelaFinalSemSeguro;
  
  if (diluirLance) {
    parcelasAPagar = prazoRestanteInicial;
    valorParcelaFinalSemSeguro =
      parcelasAPagar > 0 ? saldoDevedorParaQuitar / parcelasAPagar : 0;
  } else {
    const parcelaCheiaPosContemplacao = valorParcelaIntegral;
    valorParcelaFinalSemSeguro = parcelaCheiaPosContemplacao;
    
    parcelasAPagar =
      valorParcelaFinalSemSeguro > 0
        ? Math.ceil(saldoDevedorParaQuitar / valorParcelaFinalSemSeguro)
        : 0;
  }

  const valorParcelaFinalCOMSEGURO =
    valorParcelaFinalSemSeguro + valorSeguroMensal;

  document.getElementById("parc-a-pagar-qtd").value = parcelasAPagar;
  
  document.getElementById("parc-a-pagar-valor").value = formatarMoeda(
    valorParcelaFinalCOMSEGURO
  );

  const qtdParcelasAbatidas =
    valorParcelaIntegral > 0 ? valorLanceTotal / valorParcelaIntegral : 0;
  
  document.getElementById("qtd-parc-abatidas").value =
    qtdParcelasAbatidas.toFixed(2);

  const creditoDisponivel = credito - valorLanceEmbutido;
  document.querySelector(".lance-contemplacao .info-line:last-child input").value = formatarMoeda(creditoDisponivel);
}