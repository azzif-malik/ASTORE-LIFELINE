import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { astoreCensusContext } from "../data/censusContext";

export default function CensusContext() {
  const current = astoreCensusContext.population.toLocaleString("en-US");
  const previous = astoreCensusContext.previousCensusPopulation.toLocaleString("en-US");
  return <section className="census-context" aria-labelledby="census-context-title">
    <div className="census-context-topline"><span className="eyebrow"><i className="eyebrow-pip"/> OFFICIAL DISTRICT CONTEXT · CENSUS {astoreCensusContext.censusYear}</span><span className="census-context-place">{astoreCensusContext.unit.toUpperCase()} · GILGIT-BALTISTAN</span></div>
    <div className="census-context-main"><div className="census-context-number"><b>{current}</b><span>reported people<br/>in the 2023 census</span></div><div className="census-context-copy"><h2 id="census-context-title">A real district.<br/><em>A separate demo model.</em></h2><p>The Government of Gilgit-Baltistan reports {current} people across Astore District in its census summary. For historical context, the same table reports {previous} in {astoreCensusContext.previousCensusYear}.</p><div className="census-context-sources"><span>Source: {astoreCensusContext.statisticalSource}</span><a href={astoreCensusContext.reportUrl} target="_blank" rel="noopener noreferrer">Read {astoreCensusContext.reportTitle} <ArrowUpRight size={13}/></a><a href={astoreCensusContext.censusReportUrl} target="_blank" rel="noopener noreferrer">PBS National Census Report <ArrowUpRight size={13}/></a></div></div></div>
    <p className="census-context-boundary"><ShieldCheck size={15}/><span><b>Not an impact estimate.</b> This is a district-level count—not a count for any village, demo node, or affected group. It is not a current population estimate and does not feed the cascade calculations.</span></p>
  </section>;
}
