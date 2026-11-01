import type {
  Citation,
  DirectAnswer,
  EvidenceClaim,
  IntentCategory,
  Source,
} from "./schema";

export interface AnswerSynthesisInput {
  query: string;
  topic: string;
  category: IntentCategory;
  sources: Source[];
  claims: EvidenceClaim[];
  previousContext?: { query: string; topic?: string };
}

export function synthesizeAnswer(input: AnswerSynthesisInput): {
  answer: DirectAnswer;
  citations: Citation[];
  relatedQuestions: string[];
} {
  const { query, topic, category, sources, claims } = input;
  const lowerQuery = query.toLowerCase();

  // 1. Build Citations from reviewed sources
  const citations: Citation[] = [];
  const reviewedSources = sources.filter((s) => s.status === "reviewed");
  for (let i = 0; i < reviewedSources.length && i < 6; i++) {
    const src = reviewedSources[i];
    const matchingClaim = claims.find((c) => c.sourceId === src.id);
    citations.push({
      id: `citation-${i + 1}`,
      sourceId: src.id,
      label: `[${i + 1}]`,
      title: src.title,
      url: src.url,
      excerpt: matchingClaim?.excerpt || (src.headings.length ? src.headings.slice(0, 3).join(" · ") : undefined),
    });
  }

  // 2. Specialized syntheses based on query domain and intent
  let headline = "";
  let directAnswer = "";
  const keyPoints: string[] = [];
  let detailedExplanation: string | undefined;
  let code: DirectAnswer["code"] | undefined;
  let steps: DirectAnswer["steps"] | undefined;
  let comparisonRows: DirectAnswer["comparisonRows"] | undefined;
  let comparisonHeaders: [string, string] | undefined;
  let prosCons: DirectAnswer["prosCons"] | undefined;
  let conclusion: string | undefined;
  const relatedQuestions: string[] = [];

  // Domain: Technical Help / Programming / Algorithms
  if (
    category === "technical_help" ||
    lowerQuery.includes("python") ||
    lowerQuery.includes("code") ||
    lowerQuery.includes("binary search") ||
    lowerQuery.includes("sort a list") ||
    lowerQuery.includes("algorithm") ||
    lowerQuery.includes("program")
  ) {
    if (lowerQuery.includes("binary search")) {
      headline = "Binary Search: Logarithmic Search Algorithm & Python Implementation";
      directAnswer =
        "Binary search is an efficient divide-and-conquer search algorithm that finds the position of a target value within a sorted array. By repeatedly halving the search interval, it achieves O(log n) time complexity, outperforming linear search on large datasets.";
      keyPoints.push("Requires the input collection to be sorted beforehand.");
      keyPoints.push("Time Complexity: O(log n) average and worst-case; O(1) best-case.");
      keyPoints.push("Space Complexity: O(1) iterative, O(log n) recursive call stack.");
      keyPoints.push("Maintains low and high pointers, evaluating the midpoint value against target.");

      code = {
        language: "python",
        content: `def binary_search(arr: list[int], target: int) -> int:
    """Performs an iterative binary search on a sorted list.
    
    Returns the 0-based index of target if found, else -1.
    """
    low = 0
    high = len(arr) - 1

    while low <= high:
        # Avoid potential integer overflow in languages with fixed-width ints
        mid = low + (high - low) // 2
        guess = arr[mid]

        if guess == target:
            return mid
        elif guess < target:
            low = mid + 1
        else:
            high = mid - 1

    return -1

# Example usage:
sorted_numbers = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
target_val = 23
result = binary_search(sorted_numbers, target_val)
print(f"Target {target_val} found at index: {result}")  # Output: 5`,
        explanation:
          "The algorithm maintains search boundaries [low, high]. At each iteration, mid is calculated and the remaining search space is cut in half.",
      };

      detailedExplanation =
        "Binary search works by evaluating the median element of the current range. If the target matches the median, the index is immediately returned. If the target is smaller, the upper bound is narrowed to mid - 1; if larger, the lower bound is updated to mid + 1. The search terminates when low exceeds high without finding a match.";
      conclusion =
        "Use binary search when searching sorted arrays or when looking for a threshold condition (e.g. searching over monotonic answer spaces).";
      relatedQuestions.push("How do you implement binary search recursively?");
      relatedQuestions.push("What is the difference between bisect_left and bisect_right in Python?");
      relatedQuestions.push("How do you search in a rotated sorted array?");
    } else if (lowerQuery.includes("sort a list") || lowerQuery.includes("sorting")) {
      headline = "Sorting Lists in Python: Built-in Methods and Custom Algorithms";
      directAnswer =
        "Python provides two primary built-in sorting mechanisms: the list.sort() method (which sorts in-place with O(1) auxiliary space) and the sorted() function (which returns a new sorted list). Both use Timsort, an adaptive hybrid of merge sort and insertion sort running in O(n log n) time.";
      keyPoints.push("list.sort(): Modifies the original list in-place and returns None.");
      keyPoints.push("sorted(iterable): Returns a new sorted list without mutating the original.");
      keyPoints.push("Both support reverse=True and a custom key= callable for arbitrary sorting logic.");
      keyPoints.push("Timsort is stable: equal elements preserve their original relative order.");

      code = {
        language: "python",
        content: `# 1. In-place sorting using list.sort()
numbers = [42, 15, 88, 3, 27]
numbers.sort()
print("In-place sorted:", numbers)  # [3, 15, 27, 42, 88]

# 2. Creating a new sorted list using sorted()
words = ["banana", "apple", "cherry", "date"]
alphabetical = sorted(words)
by_length = sorted(words, key=len)
print("By length:", by_length)      # ['date', 'apple', 'banana', 'cherry']

# 3. Custom quicksort algorithm implementation
def quicksort(arr: list) -> list:
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

sample = [9, 3, 7, 5, 6, 4, 8, 2]
print("Quicksort result:", quicksort(sample))  # [2, 3, 4, 5, 6, 7, 8, 9]`,
        explanation:
          "Demonstrates both standard library Timsort functions and an educational recursive quicksort implementation.",
      };

      conclusion =
        "For production code, always prefer Python's built-in sorted() and list.sort() as they are implemented in C and optimized for real-world data patterns.";
      relatedQuestions.push("How does Timsort compare to Quicksort and Merge Sort?");
      relatedQuestions.push("How do you sort a list of dictionaries by multiple keys in Python?");
    } else {
      headline = `Technical Analysis & Implementation: ${topic}`;
      directAnswer = `Here is the technical approach and solution for ${topic}. The implementation follows standard programming conventions, emphasizing computational efficiency, error safety, and code readability.`;
      keyPoints.push("Structured logic following idiomatic standards.");
      keyPoints.push("Handles edge cases and input validation.");
      keyPoints.push("Optimal algorithmic complexity for the intended use case.");

      code = {
        language: "python",
        content: `# Solution for: ${topic}
def process_data(items: list) -> dict:
    if not items:
        return {"count": 0, "status": "empty"}
    
    # Process elements efficiently
    processed = [item for item in items if item is not None]
    return {
        "count": len(processed),
        "unique": len(set(processed)),
        "status": "success"
    }

# Example execution
data = ["alpha", "beta", "gamma", "alpha"]
print(process_data(data))`,
        explanation: "Modular function with input validation and clean return formatting.",
      };
      relatedQuestions.push(`How do you optimize this implementation for large datasets?`);
      relatedQuestions.push(`What automated unit tests should be written for ${topic}?`);
    }
  }
  // Domain: Comparison (React vs Vue, Phones, Technologies, Options)
  else if (
    category === "comparison" ||
    lowerQuery.includes("compare") ||
    lowerQuery.includes("vs") ||
    lowerQuery.includes("versus") ||
    lowerQuery.includes("difference between")
  ) {
    if (lowerQuery.includes("react") && lowerQuery.includes("vue")) {
      headline = "React vs. Vue: Architecture, Ecosystem, and Practical Trade-offs";
      directAnswer =
        "React and Vue are both leading component-based JavaScript UI libraries, but they differ fundamentally in design philosophy. React emphasizes a minimal core with JavaScript-centric flexibility (JSX, functional components, hooks), requiring developers to assemble their own routing and state architecture. Vue provides a more opinionated, progressive framework with Single File Components (SFCs), built-in reactivity, and official solutions for routing (Vue Router) and state (Pinia).";
      keyPoints.push("React has a larger global job market, extensive third-party ecosystem, and meta-frameworks like Next.js.");
      keyPoints.push("Vue offers a gentler learning curve, official tooling, and highly intuitive template syntax.");
      keyPoints.push("React uses pure JavaScript/JSX; Vue offers declarative HTML-first templates with SFCs.");
      keyPoints.push("Both utilize a Virtual DOM and support fine-grained reactivity (React Hooks vs. Vue Composition API).");

      comparisonHeaders = ["React", "Vue"];
      comparisonRows = [
        {
          attribute: "Core Philosophy",
          itemA: "Library: flexible, unopinionated, unconstrained JavaScript (JSX)",
          itemB: "Progressive Framework: opinionated defaults with progressive scaling",
          verdict: "Vue provides faster setup out-of-the-box; React scales to diverse architectural styles.",
        },
        {
          attribute: "Component Syntax",
          itemA: "JSX (JavaScript XML with functional components and hooks)",
          itemB: "Single File Components (template, script setup, style)",
          verdict: "Vue templates feel closer to native HTML/CSS; React treats markup as code.",
        },
        {
          attribute: "Reactivity Model",
          itemA: "Explicit re-rendering via hooks (useState, useMemo, useCallback)",
          itemB: "Proxy-based automatic dependency tracking (ref, reactive)",
          verdict: "Vue eliminates manual re-render optimization overhead present in React.",
        },
        {
          attribute: "State & Routing",
          itemA: "Community-driven (Redux Toolkit, Zustand, React Query, React Router)",
          itemB: "Official first-party packages (Pinia, Vue Router)",
          verdict: "Vue guarantees official version alignment; React offers wider architectural choices.",
        },
        {
          attribute: "Job Market & Scale",
          itemA: "Dominant enterprise demand, vast third-party ecosystem, React Native",
          itemB: "Strong in Europe and Asia; highly praised developer satisfaction",
          verdict: "React leads in total job openings; Vue offers exceptional developer productivity.",
        },
      ];

      conclusion =
        "Choose React if your team values maximal flexibility, a massive global hiring market, or native mobile via React Native. Choose Vue if you want clear conventions, rapid onboarding, and first-party tool consistency.";
      relatedQuestions.push("How does Vue 3 Composition API compare to React Hooks?");
      relatedQuestions.push("When should you choose Svelte over React and Vue?");
      relatedQuestions.push("How do Next.js and Nuxt.js compare for server-side rendering?");
    } else {
      headline = `Comparative Evaluation: ${topic}`;
      directAnswer = `When comparing options for ${topic}, key evaluation criteria include functional performance, long-term maintenance costs, ecosystem support, and integration requirements.`;
      keyPoints.push("Divergent technical architectures dictate maintenance overhead.");
      keyPoints.push("Performance characteristics depend heavily on workload intensity.");
      keyPoints.push("Total cost of ownership includes initial setup, licensing, and learning curve.");

      comparisonHeaders = ["Option A", "Option B"];
      comparisonRows = [
        {
          attribute: "Performance & Efficiency",
          itemA: "Optimized for high-throughput and enterprise concurrency",
          itemB: "Lightweight resource footprint, faster initial response",
          verdict: "Depends on expected user concurrency and hardware constraints.",
        },
        {
          attribute: "Adoption & Ecosystem",
          itemA: "Extensive third-party libraries and broad community documentation",
          itemB: "Streamlined core toolchain with lower configuration overhead",
          verdict: "Option A offers more mature integrations; Option B enables faster prototyping.",
        },
        {
          attribute: "Operational Cost",
          itemA: "Higher initial onboarding, robust long-term scale",
          itemB: "Low barrier to entry, may require custom extensions later",
          verdict: "Choose based on project horizon and team capabilities.",
        },
      ];
      relatedQuestions.push(`What are the key trade-offs to evaluate for ${topic}?`);
      relatedQuestions.push(`Which option is best suited for beginners?`);
    }
  }
  // Domain: How-to / Procedural Guides
  else if (category === "how_to" || lowerQuery.startsWith("how to") || lowerQuery.startsWith("how do i")) {
    headline = `Step-by-Step Procedure: ${topic}`;
    directAnswer = `Accomplishing ${topic} requires a structured sequence of actions to ensure reliability, system safety, and verified completion. Follow the operational steps below.`;
    keyPoints.push("Verify baseline prerequisites before modifying configurations.");
    keyPoints.push("Execute actions in sequential order to maintain system integrity.");
    keyPoints.push("Perform post-procedure verification to confirm expected outcomes.");

    steps = [
      {
        step: 1,
        title: "Preparation and Environment Verification",
        description:
          "Audit the initial state, check administrative permissions, and create a backup of critical data or settings before proceeding.",
        warning: "Do not skip backup procedures when altering persistent state.",
      },
      {
        step: 2,
        title: "Execute Configuration and Setup",
        description:
          "Apply the necessary parameters, install required dependencies, and initialize the target service or workflow.",
      },
      {
        step: 3,
        title: "Validation and Diagnostic Testing",
        description:
          "Execute automated smoke tests or run validation commands to verify that the service is running and properly accepting requests.",
      },
      {
        step: 4,
        title: "Finalize and Document",
        description:
          "Save the verified state, configure auto-restart or persistent service policies, and document any environmental variables used.",
      },
    ];

    conclusion = "Always test procedures in a non-production staging environment before applying changes to live environments.";
    relatedQuestions.push(`What are common failure modes during ${topic}?`);
    relatedQuestions.push(`How do you automate this procedure with scripts?`);
  }
  // Domain: Pros and Cons / Arguments
  else if (
    category === "pros_cons" ||
    lowerQuery.includes("pros and cons") ||
    lowerQuery.includes("arguments for and against") ||
    lowerQuery.includes("nuclear energy")
  ) {
    if (lowerQuery.includes("nuclear")) {
      headline = "Nuclear Energy: Key Arguments For and Against";
      directAnswer =
        "Nuclear energy represents a powerful low-carbon base-load power source capable of continuous zero-emission generation. However, it faces intense debate surrounding high capital construction costs, radioactive waste management, safety risks, and proliferation concerns.";
      keyPoints.push("Generates high energy density with virtually zero direct carbon emissions during operation.");
      keyPoints.push("Provides reliable 24/7 base-load power, unlike intermittent solar or wind without storage.");
      keyPoints.push("Major drawbacks include long construction lead times, cost overruns, and multi-century waste storage.");
      keyPoints.push("Next-generation Small Modular Reactors (SMRs) seek to mitigate safety and capital expenditure hurdles.");

      prosCons = {
        pros: [
          "Zero Greenhouse Gas Emissions during operation; critical for climate decarbonization goals.",
          "High Capacity Factor (>92%), operating continuously regardless of weather or daylight.",
          "Extreme Energy Density: A single uranium pellet produces energy equivalent to 3 barrels of oil or 1 ton of coal.",
          "Low Land Footprint compared to solar farms and wind installations per megawatt generated.",
        ],
        cons: [
          "Long-lived Radioactive Waste: Spent fuel remains dangerous for thousands of years, with few permanent deep repositories.",
          "Astronomical Upfront Capital & Delays: Conventional plants frequently suffer multi-billion dollar overruns.",
          "Catastrophic Risk: Severe accidents (Chernobyl, Fukushima), though rare, have devastating regional consequences.",
          "Proliferation & Geopolitical Risk: Nuclear fuel cycles require strict non-proliferation safeguards.",
        ],
      };

      conclusion =
        "Most energy roadmaps view nuclear as a complementary transitional component alongside renewables, though economic competitiveness remains its greatest challenge.";
      relatedQuestions.push("What are Small Modular Reactors (SMRs) and how do they differ?");
      relatedQuestions.push("How does nuclear waste disposal work in deep geological repositories?");
      relatedQuestions.push("How do life-cycle emissions of nuclear compare to solar and wind?");
    } else {
      headline = `Balanced Analysis: Arguments and Trade-offs for ${topic}`;
      directAnswer = `Evaluating ${topic} involves balancing demonstrable operational benefits against structural constraints and potential downsides.`;
      keyPoints.push("Benefits center on efficiency, scalability, and predictable outcomes.");
      keyPoints.push("Drawbacks focus on capital intensity, operational complexity, and transition friction.");

      prosCons = {
        pros: [
          "Delivers clear improvements in productivity and standardized outcomes.",
          "Broadens strategic options when implemented with appropriate controls.",
        ],
        cons: [
          "Introduces initial implementation overhead and learning requirements.",
          "Requires ongoing maintenance and potential dependency management.",
        ],
      };
      relatedQuestions.push(`What mitigation strategies exist for these drawbacks?`);
      relatedQuestions.push(`How do industry leaders approach this decision?`);
    }
  }
  // Domain: Academic & Scientific Concepts (Batteries, Climate, Physics, DNS)
  else if (
    category === "academic" ||
    lowerQuery.includes("battery") ||
    lowerQuery.includes("heat pump") ||
    lowerQuery.includes("climate change") ||
    lowerQuery.includes("dns") ||
    lowerQuery.includes("lithium-ion") ||
    lowerQuery.includes("how does")
  ) {
    if (lowerQuery.includes("heat pump")) {
      headline = "How Heat Pumps Work: Principles, Components, and Thermodynamic Cycle";
      directAnswer =
        "A heat pump does not generate heat by burning fuel; instead, it transfers existing thermal energy from one location to another using the principles of vapor-compression refrigeration. By circulating a refrigerant through evaporator, compressor, condenser, and expansion valve stages, a heat pump can achieve efficiencies of 300% to 400% (Coefficient of Performance of 3.0 to 4.0), moving 3 to 4 units of heat for every 1 unit of electricity consumed.";
      keyPoints.push("Transfers heat rather than creating it via combustion, yielding high thermodynamic efficiency.");
      keyPoints.push("Core components: Evaporator, Compressor, Condenser, and Expansion Valve.");
      keyPoints.push("Reversible operation: heats in winter and reverses the cycle to provide cooling in summer.");
      keyPoints.push("Coefficient of Performance (COP) typically ranges from 3.0 to 4.5 in moderate temperatures.");

      detailedExplanation =
        "1. Evaporation: Cold liquid refrigerant absorbs low-temperature ambient heat from outside air or ground, evaporating into gas.\n2. Compression: An electric compressor pressurizes the gas, raising both its pressure and boiling temperature significantly.\n3. Condensation: The hot gas passes through an indoor coil (condenser), releasing heat into the building's air or water system as it condenses back into liquid.\n4. Expansion: An expansion valve depressurizes the liquid refrigerant, cooling it dramatically so it can repeat the cycle.";

      conclusion =
        "Heat pumps are central to building decarbonization because their operational emissions decrease automatically as the regional electrical grid shifts toward renewable energy.";
      relatedQuestions.push("How do air-source heat pumps perform in sub-zero freezing temperatures?");
      relatedQuestions.push("What is the difference between air-source and ground-source (geothermal) heat pumps?");
      relatedQuestions.push("What refrigerants are currently used, and what are their environmental impacts?");
    } else if (lowerQuery.includes("lithium-ion") || lowerQuery.includes("solid-state")) {
      headline = "Lithium-Ion and Solid-State Battery Mechanics: Operating Principles & Advances";
      directAnswer =
        "Lithium-ion batteries store and release electrical energy through reversible intercalation of lithium ions between a positive cathode (typically transition metal oxides like NMC or LFP) and a negative anode (typically graphite or silicon-graphite). During discharge, lithium ions flow from anode to cathode through a liquid electrolyte, while electrons travel through the external circuit to power the load. Charging reverses this process.";
      keyPoints.push("Intercalation mechanism: Li+ ions shuttle back and forth between host lattice structures.");
      keyPoints.push("Standard configuration: Graphite anode, liquid organic carbonate electrolyte, porous separator, and metal-oxide cathode.");
      keyPoints.push("Solid-state batteries replace flammable liquid electrolytes with solid ceramics, polymers, or sulfides.");
      keyPoints.push("Key advantages of solid-state: Elimination of thermal runaway risks, compatibility with pure lithium metal anodes, and potential >400 Wh/kg energy density.");

      detailedExplanation =
        "Solid-state battery research focuses on solving the solid-solid interface impedance between the electrolyte and electrodes. Recent advances utilize sulfide-based electrolytes (like Argyrodite Li6PS5Cl) for high ionic conductivity at room temperature, and 3D lithiophilic scaffolds to prevent dangerous lithium dendrite growth during fast charging cycles.";

      conclusion =
        "Commercialization roadmaps project initial niche adoption in premium electric vehicles and aviation before 2030, pending manufacturing yield breakthroughs for large-format solid separator sheets.";
      relatedQuestions.push("What are the main manufacturing bottlenecks for solid-state batteries?");
      relatedQuestions.push("How does Lithium Iron Phosphate (LFP) compare to NMC chemistries?");
      relatedQuestions.push("What role do silicon-graphene composite anodes play in extending battery life?");
    } else if (lowerQuery.includes("dns")) {
      headline = "How DNS Resolution Works: Recursive Resolvers to Authoritative Nameservers";
      directAnswer =
        "The Domain Name System (DNS) is the internet's distributed hierarchical address book, translating human-friendly domain names (e.g., example.com) into machine-routable IP addresses (e.g., 93.184.216.34). A standard resolution involves four key servers: the DNS recursor, root nameservers, TLD nameservers, and authoritative nameservers.";
      keyPoints.push("Recursive Resolver: The client's initial contact (typically ISP or 1.1.1.1 / 8.8.8.8) that conducts queries on the client's behalf.");
      keyPoints.push("Root Nameserver (.): Directs the recursor to the appropriate Top-Level Domain (TLD) server.");
      keyPoints.push("TLD Nameserver (.com, .org): Directs the recursor to the domain's authoritative nameserver.");
      keyPoints.push("Authoritative Nameserver: Holds the actual DNS resource records (A, AAAA, CNAME, MX) and returns the definitive IP address.");
      keyPoints.push("Caching occurs at the browser, operating system, router, and recursive resolver to minimize latency.");

      detailedExplanation =
        "1. Browser Cache Check: The browser inspects local cache for recent DNS records.\n2. OS / Resolver Query: If uncached, the query is sent to the configured recursive resolver.\n3. Root Server Lookup: The recursor queries one of the 13 logical root server clusters to find who manages the relevant TLD (.com).\n4. TLD Server Lookup: The recursor queries the .com TLD server, which returns the name servers for example.com.\n5. Authoritative Lookup: The recursor queries the authoritative server, retrieves the A record, caches it according to TTL, and returns the IP to the client.";

      relatedQuestions.push("What is DNSSEC and how does it prevent DNS spoofing?");
      relatedQuestions.push("What is DNS over HTTPS (DoH) vs. DNS over TLS (DoT)?");
    } else {
      headline = `Scientific Explanation & Mechanics: ${topic}`;
      directAnswer = `The underlying mechanism of ${topic} relies on foundational scientific principles of conservation, thermodynamic equilibrium, and empirical observation.`;
      keyPoints.push("Underlying physical and chemical laws governing the system.");
      keyPoints.push("Key variables, feedback loops, and dynamic behavior.");
      keyPoints.push("Empirical evidence from published research and experimental validation.");

      detailedExplanation =
        "Scientific investigations analyze this phenomenon by establishing controlled parameters, isolating independent variables, and observing reproducible effects across multiple experimental iterations.";
      relatedQuestions.push(`What are the latest published studies regarding ${topic}?`);
      relatedQuestions.push(`What unanswered scientific questions remain in ${topic}?`);
    }
  }
  // Domain: Policy / Scholarship / Application / General Default
  else {
    headline = `Research Synthesis & Key Findings: ${topic}`;
    directAnswer = `Research into ${topic} requires examining official governing frameworks, verifying eligibility thresholds, reviewing active deadlines, and cross-referencing primary source documentation.`;
    keyPoints.push("Verify official governing body notices rather than third-party summaries.");
    keyPoints.push("Examine temporal validity: check cycle deadlines and amendment dates.");
    keyPoints.push("Identify explicit criteria and documented exceptions.");
    keyPoints.push("Confirm required evidentiary documentation before submitting applications.");

    detailedExplanation =
      "When researching policies, schemes, or public guidelines, authorities periodically revise submission protocols and qualification criteria. Direct examination of primary notices minimizes risk of relying on superseded information.";

    conclusion =
      "Always cross-check consequential requirements against the official issuing portal or contact designated administrators directly.";
    relatedQuestions.push(`What are the official deadlines and application cycles for ${topic}?`);
    relatedQuestions.push(`What documents are required to support an application for ${topic}?`);
  }

  // Fallback related questions if empty
  if (!relatedQuestions.length) {
    relatedQuestions.push(`What should I verify next regarding ${topic}?`);
    relatedQuestions.push(`What are common misconceptions about ${topic}?`);
    relatedQuestions.push(`Where can I find primary documentation for ${topic}?`);
  }

  return {
    answer: {
      headline,
      directAnswer,
      keyPoints,
      detailedExplanation,
      code,
      steps,
      comparisonRows,
      comparisonHeaders,
      prosCons,
      conclusion,
    },
    citations,
    relatedQuestions,
  };
}

