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
    ];

    inputsParaRecalculo.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("input", calcularSimulacao);
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
    const cleaned = valorStr
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[R$%]/g, "")
        .trim();
    return parseFloat(cleaned) || 0;
}

function calcularSimulacao() {
    const credito = parseInput(document.getElementById("credito").value);
    const taxaAdm = parseInput(document.getElementById("taxa-adm").value) / 100;
    const qtdMeses = parseInt(document.getElementById("qtd-meses").value) || 0;
    const qtdParcelasPagas = parseInt(document.getElementById("qtd-parc-pagas").value) || 0;
    const percLanceOfertado = parseInput(document.getElementById("perc-lance-ofertado").value) / 100;
    const diluirLance = document.getElementById("diluir-lance").value === "1";
    const percRedutor = parseInput(document.getElementById("redutor-opc")?.value) / 100; 
    const tipoSeguro = parseInt(document.getElementById("tipo-seguro")?.value) || 1; 

    const taxaSeguroMensal = 0.0004;
    const valorSeguroMensal = credito * taxaSeguroMensal;

    const saldoDevedorTotal = credito * (1 + taxaAdm);
    const valorParcelaIntegral = qtdMeses > 0 ? saldoDevedorTotal / qtdMeses : 0;

    const valorParcelaFlex = valorParcelaIntegral * (1 - percRedutor);
    const valorResidualPorMes = valorParcelaIntegral * percRedutor;
    const saldoResidualAcumulado = valorResidualPorMes * qtdParcelasPagas;
    
    const redutorLabel = document.getElementById("redutor-label");
    if(redutorLabel) {
        redutorLabel.value = `${(percRedutor * 100).toFixed(0)}%`;
    }

    document.getElementById("saldo-devedor-inicial").value = formatarMoeda(saldoDevedorTotal);
    
    const parcelaParaExibir = (percRedutor > 0) ? valorParcelaFlex : valorParcelaIntegral;
    document.getElementById("valor-parcela-base").value = formatarMoeda(parcelaParaExibir + valorSeguroMensal);

    const valorLance = credito * percLanceOfertado;
    let saldoDevedorParaQuitar = saldoDevedorTotal - valorLance;
    
    saldoDevedorParaQuitar += saldoResidualAcumulado; 

    document.getElementById("valor-lance-ofertado").value = formatarMoeda(valorLance);
    document.getElementById("saldo-devedor-final").textContent = formatarMoeda(saldoDevedorParaQuitar);
    document.getElementById("diluir-lance-label").textContent = diluirLance ? "Sim (Reduz Parcela)" : "Não (Abate Prazo)";

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
    
    const valorParcelaFinalCOMSEGURO = valorParcelaFinalSemSeguro + valorSeguroMensal;

    document.getElementById("parc-a-pagar-qtd").value = parcelasAPagar;
    document.getElementById("parc-a-pagar-valor").value =
        formatarMoeda(valorParcelaFinalCOMSEGURO);
        
    const qtdParcelasAbatidas = valorParcelaIntegral > 0 ? valorLance / valorParcelaIntegral : 0;
    document.getElementById("qtd-parc-abatidas").value = qtdParcelasAbatidas.toFixed(2);
}