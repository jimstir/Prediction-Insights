import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { marketTitle, userQuery } = await request.json();

    if (!marketTitle) {
      return NextResponse.json(
        { error: "Market title is required" },
        { status: 400 }
      );
    }

    const queryText = userQuery || "What are the main drivers and risks for this market?";

    // System prompt setting the context
    const systemPrompt = `You are a professional Prediction Market & Geopolitical Analyst. 
Provide a high-fidelity, data-driven analysis of the prediction market: "${marketTitle}".
Address the user's specific query/concern: "${queryText}".
Format your response in beautiful Markdown, utilizing headers, bullet points, and bulleted lists.
Ensure you structure the report into clear sections:
1. **Implied Probability Analysis** - Evaluate the current sentiment.
2. **Key YES Catalyst Drivers** - What drives the YES outcome.
3. **Key NO Catalyst Drivers** - What drives the NO outcome.
4. **Market Risks & Traps** - Edge cases, resolution parameters, or sudden news risks.
Keep the tone objective, analytical, and professional.`;

    // Check which API keys are available in environment variables
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const preferredProvider = process.env.LLM_PROVIDER?.toLowerCase();

    // 1. Try Gemini if configured or preferred
    if (geminiKey && (!preferredProvider || preferredProvider === "gemini") && geminiKey !== "your_gemini_api_key_here") {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${systemPrompt}\n\nAnalyze this prediction market based on public info and standard market patterns.`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return NextResponse.json({ provider: "gemini", text });
          }
        } else {
          console.error("Gemini API error:", await response.text());
        }
      } catch (err) {
        console.error("Failed to query Gemini:", err);
      }
    }

    // 2. Try OpenAI if configured
    if (openaiKey && (!preferredProvider || preferredProvider === "openai") && openaiKey !== "your_openai_api_key_here") {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are a professional prediction market analyst." },
              { role: "user", content: systemPrompt },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) {
            return NextResponse.json({ provider: "openai", text });
          }
        } else {
          console.error("OpenAI API error:", await response.text());
        }
      } catch (err) {
        console.error("Failed to query OpenAI:", err);
      }
    }

    // 3. Try Anthropic if configured
    if (anthropicKey && (!preferredProvider || preferredProvider === "anthropic") && anthropicKey !== "your_anthropic_api_key_here") {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 1024,
            messages: [{ role: "user", content: systemPrompt }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.content?.[0]?.text;
          if (text) {
            return NextResponse.json({ provider: "anthropic", text });
          }
        } else {
          console.error("Anthropic API error:", await response.text());
        }
      } catch (err) {
        console.error("Failed to query Anthropic:", err);
      }
    }

    // Fallback: Generate high-fidelity simulated response
    console.log("No valid API keys found. Generating high-fidelity mock AI response.");
    const simulatedAnalysis = generateMockAnalysis(marketTitle, queryText);
    return NextResponse.json({ provider: "mockup-analyzer", text: simulatedAnalysis });

  } catch (error) {
    console.error("AI Insights Endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error during analysis generation" },
      { status: 500 }
    );
  }
}

// High-fidelity mockup generator to create custom reports for any market on the fly
function generateMockAnalysis(title, query) {
  // Extract keywords for customization
  const lowercaseTitle = title.toLowerCase();
  
  let probability = "58%";
  let sentiment = "Moderately Bullish";
  let catalystYes = [
    "Accelerating technological progress and supportive regulatory shifts.",
    "Positive early indicators and momentum from key decision-makers.",
    "Strong macro-economic alignment creating structural tailwinds."
  ];
  let catalystNo = [
    "Potential supply chain bottlenecking or execution friction.",
    "Unforeseen macroeconomic headwinds or central bank policy shifts.",
    "Alternative solutions or competitor movements mitigating the primary trigger."
  ];
  let riskTitle = "Resolution Parameter Clarity";
  let riskText = "The main risk lies in the exact phrasing of the Polymarket resolution rules. If the event details are ambiguous, the market might resolve to 50-50 or rely on a consensus ruling by the UMA Oracle.";

  // Tailor based on common keywords
  if (lowercaseTitle.includes("fed") || lowercaseTitle.includes("rate") || lowercaseTitle.includes("interest")) {
    probability = "64%";
    sentiment = "Bullish on Rate Cuts";
    catalystYes = [
      "Soften inflation readings (CPI & PCE) aligning with the Fed's target.",
      "Marginal rises in unemployment rates prompting dovish FOMC statements.",
      "Public commentary from regional Fed Presidents leaning toward monetary easing."
    ];
    catalystNo = [
      "Core inflation remaining sticky or rebounding due to consumer demand.",
      "Labor market reports displaying persistent strength and wage pressure.",
      "Global energy price shocks causing supply-side inflation spikes."
    ];
    riskTitle = "UMA Resolution Parameters";
    riskText = "This market relies strictly on the official press release of the Federal Reserve Board. Unscheduled emergency FOMC meetings or unexpected fractional cuts can cause volatile swings and dispute resolutions.";
  } else if (lowercaseTitle.includes("spacex") || lowercaseTitle.includes("starship") || lowercaseTitle.includes("launch")) {
    probability = "47%";
    sentiment = "Cautiously Optimistic";
    catalystYes = [
      "FAA environmental licensing approval progressing ahead of schedule.",
      "Successful wet dress rehearsals at Starbase, Boca Chica.",
      "SpaceX internal schedules pointing to flight readiness and active hardware testing."
    ];
    catalystNo = [
      "Regulator review delays due to environmental impact mitigation requirements.",
      "Static fire anomalies or engine sensor warnings necessitating rollbacks.",
      "Wind and weather constraints at the launchpad leading to scrubs."
    ];
    riskTitle = "Launch Definition Constraints";
    riskText = "Polymarket rules define a 'launch' as a vehicle clearing the tower. If the launch is scrubbed or encounters an anomaly on the pad, the timing of resolution becomes critical.";
  } else if (lowercaseTitle.includes("bitcoin") || lowercaseTitle.includes("btc") || lowercaseTitle.includes("crypto")) {
    probability = "35%";
    sentiment = "Bearish / Low Probability";
    catalystYes = [
      "Sovereign wealth funds or secondary nation-states looking to hedge fiat inflation.",
      "Favorable crypto-asset legislation passed in major economic corridors.",
      "Technological scaling upgrades making BTC transactions viable for local commerce."
    ];
    catalystNo = [
      "IMF and World Bank warnings threatening trade sanctions for crypto-tender laws.",
      "High transaction fees during network congestion discouraging transactional use.",
      "Political shifts in target countries leading to reversals in adoption plans."
    ];
    riskTitle = "Legal Tender Definition";
    riskText = "Resolution depends on a country's official legislative declaration of Bitcoin as 'legal tender'. A state merely holding BTC on their balance sheet does not trigger a YES resolution.";
  }

  return `# Market Insights: ${title}
*(Generated by AI Insights Fallback Analyzer)*

---

### Implied Probability Analysis
The market currently reflects an implied probability of **${probability}** (Sentiment: **${sentiment}**). 

This represents the market's aggregate consensus. The response below addresses your query: *"${query}"*.

---

### Key YES Catalyst Drivers
If this event resolves **YES**, it is likely driven by the following factors:
* **Catalyst 1**: ${catalystYes[0]}
* **Catalyst 2**: ${catalystYes[1]}
* **Catalyst 3**: ${catalystYes[2]}

---

### Key NO Catalyst Drivers
If this event resolves **NO**, it is likely due to:
* **Mitigator 1**: ${catalystNo[0]}
* **Mitigator 2**: ${catalystNo[1]}
* **Mitigator 3**: ${catalystNo[2]}

---

### Market Risks & Traps
> [!WARNING]
> **${riskTitle}**
> ${riskText}

*Trader Action: Keep a close eye on oracle disputes, as prediction markets are highly sensitive to the source of resolution data.*`;
}
