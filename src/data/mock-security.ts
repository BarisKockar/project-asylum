import { SystemSnapshot } from "@/types/security";

export const systemSnapshot: SystemSnapshot = {
  productName: "Project Asylum",
  mission:
    "AI destekli siber guvenlik orkestrasyonu ile zafiyetleri tespit eden, dogrulayan, onceliklendiren ve kontrollu sekilde onaran guvenlik platformu.",
  protectionGoals: [
    "Sunucu ve servis varliklarini surekli gozlemlemek",
    "Yanlis pozitifleri azaltacak dogrulama katmani kurmak",
    "Kontrollu otomasyonla hizli ve geri alinabilir onarim yapmak",
    "Tum aksiyonlari audit uyumlu sekilde raporlamak"
  ],
  workflow: [
    {
      name: "Discovery",
      description: "Port, servis, dependency, config ve runtime yuzeyini toplar.",
      status: "active"
    },
    {
      name: "Detection",
      description: "Kural, tehdit istihbarati ve AI analizi ile bulgu olusturur.",
      status: "active"
    },
    {
      name: "Verification",
      description: "Bulgulari guvenli testlerle dogrulayip risk puanini netlestirir.",
      status: "planned"
    },
    {
      name: "Decision",
      description: "Etki, kesinti riski, geri donus ve insan onayi ihtiyacini belirler.",
      status: "planned"
    },
    {
      name: "Remediation",
      description: "Playbook tabanli duzeltmeleri kontrollu sekilde uygular.",
      status: "planned"
    },
    {
      name: "Reporting",
      description: "Bulgulari, karar gerekcesini ve onarim sonucunu raporlar.",
      status: "planned"
    }
  ],
  findings: [
    {
      id: "F-001",
      title: "Publicly exposed admin panel",
      asset: "prod-gateway-01",
      severity: "critical",
      confidence: 0.94,
      summary:
        "Admin panel endpoint'i public agdan erisilebilir durumda ve ek IP kisitlamasi bulunmuyor.",
      evidence: [
        "443/tcp endpoint responds with admin login form",
        "No VPN or IP allow-list detected",
        "Repeated unauthenticated probe attempts in access logs"
      ],
      recommendedAction:
        "Erisimi allow-list veya VPN arkasina al, MFA zorunlulugu ekle, log korelasyonunu sikilastir.",
      requiresApproval: true
    },
    {
      id: "F-002",
      title: "Outdated package with known CVE",
      asset: "ticketing-api",
      severity: "high",
      confidence: 0.88,
      summary:
        "Dependency grafinda bilinen zafiyete sahip bir paket surumu tespit edildi.",
      evidence: [
        "Version matches advisory range",
        "Package is loaded in production build path"
      ],
      recommendedAction:
        "Guvenli surume guncelle, regression test calistir, rollout oncesi changelog kontrolu yap.",
      requiresApproval: false
    }
  ],
  playbooks: [
    {
      id: "P-001",
      title: "Restrict management surface",
      blastRadius: "moderate",
      rollbackReady: true,
      automationLevel: "assist",
      steps: [
        "Mevcut ingress kurallarini yedekle",
        "Yonetim endpoint'ini allow-list ile sinirla",
        "MFA enforcement durumunu kontrol et",
        "Erisim loglarini 15 dakika izle"
      ]
    },
    {
      id: "P-002",
      title: "Patch vulnerable dependency",
      blastRadius: "restricted",
      rollbackReady: true,
      automationLevel: "auto-remediate",
      steps: [
        "Paket surumunu guvenli araliga cek",
        "Unit ve smoke test calistir",
        "Artefact olustur ve staged rollout yap",
        "Hata halinde onceki lockfile'a don"
      ]
    }
  ]
};
