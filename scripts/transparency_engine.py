#!/usr/bin/env python3
"""
Phase 4: Transparency Engine

Provides explainable predictions for fraud detection and risk scoring models.
Generates reason codes, explanations, and actionable insights for each prediction.
"""

import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Dict, Any, Tuple
from enum import Enum


class SeverityLevel(Enum):
    """Severity levels for reason codes."""
    CRITICAL = 4
    HIGH = 3
    MEDIUM = 2
    LOW = 1


@dataclass
class ReasonCode:
    """Individual reason code with context."""
    code: str
    severity: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    explanation: str
    metric_value: float = None
    threshold: float = None


@dataclass
class ExplanationReport:
    """Complete explanation report for a prediction."""
    prediction_id: str
    timestamp: str
    subject_id: str
    model_type: str  # "fraud" or "risk"
    score: float
    band: str  # "low", "medium", "high"
    confidence: float
    primary_reason_code: str
    supporting_reasons: List[Dict[str, Any]]
    human_summary: str
    suggested_actions: List[str]


class FraudExplainer:
    """Explains fraud detection predictions."""
    
    FRAUD_SEVERITY_MAP = {
        # CRITICAL
        "FRD_GEO_MISMATCH": "CRITICAL",
        "FRD_DEVICE_FLAGGED": "CRITICAL",
        "FRD_MERCHANT_FLAGGED": "CRITICAL",
        # HIGH
        "FRD_VEL_BURST": "HIGH",
        "FRD_AMT_SPIKE": "HIGH",
        "FRD_GEO_JUMP": "HIGH",
        "FRD_BEHAVIOR_CHANGE": "HIGH",
        # MEDIUM
        "FRD_VEL_HIGH": "MEDIUM",
        "FRD_AMT_DEVIATION": "MEDIUM",
        "FRD_MERCHANT_NEW": "MEDIUM",
        "FRD_GEO_NEW_CITY": "MEDIUM",
        "FRD_GEO_NEW_COUNTRY": "MEDIUM",
        # LOW
        "FRD_DEVICE_NEW": "LOW",
        "FRD_BEHAVIOR_TIME": "LOW",
    }
    
    def explain_prediction(
        self,
        subject_id: str,
        fraud_score: float,
        fraud_band: str,
        features: Dict[str, float],
        baseline_features: Dict[str, float] = None,
    ) -> ExplanationReport:
        """
        Generate explanation for fraud prediction.
        
        Args:
            subject_id: Transaction or user ID
            fraud_score: Fraud score 0-1
            fraud_band: low/medium/high
            features: Feature values for this transaction
            baseline_features: User baseline values for comparison
        """
        # Extract reason codes from features
        reason_codes = self._extract_fraud_reasons(features, baseline_features or {})
        
        # Sort by severity
        reason_codes.sort(
            key=lambda x: SeverityLevel[x["severity"]].value,
            reverse=True
        )
        
        primary_reason = reason_codes[0]["code"] if reason_codes else "UNKNOWN"
        supporting_reasons = reason_codes[1:4] if len(reason_codes) > 1 else []
        
        # Generate human-readable summary
        human_summary = self._generate_fraud_summary(
            fraud_band,
            reason_codes[:3]
        )
        
        # Generate suggested actions
        suggested_actions = self._get_fraud_actions(reason_codes[:3])
        
        # Confidence based on feature strength
        confidence = min(0.95, 0.5 + fraud_score * 0.45)
        
        report = ExplanationReport(
            prediction_id=f"fraud_{subject_id}_{datetime.now().timestamp()}",
            timestamp=datetime.now().isoformat(),
            subject_id=subject_id,
            model_type="fraud",
            score=float(fraud_score),
            band=fraud_band,
            confidence=float(confidence),
            primary_reason_code=primary_reason,
            supporting_reasons=supporting_reasons,
            human_summary=human_summary,
            suggested_actions=suggested_actions,
        )
        
        return report
    
    def _extract_fraud_reasons(
        self,
        features: Dict[str, float],
        baseline: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Extract reason codes from features."""
        reasons = []
        
        # Velocity checks
        velocity = features.get("velocity", 0)
        if velocity >= 4:
            reasons.append({
                "code": "FRD_VEL_HIGH",
                "severity": "MEDIUM",
                "explanation": f"{int(velocity)} transactions in 24 hours (baseline: ~1-2 per day)",
                "metric_value": velocity,
            })
        
        # Amount deviation check
        amt_dev = features.get("amount_deviation", 0)
        if amt_dev > 2.0:
            reasons.append({
                "code": "FRD_AMT_SPIKE",
                "severity": "HIGH",
                "explanation": f"Amount is {amt_dev:.1f} standard deviations from user average",
                "metric_value": amt_dev,
            })
        elif amt_dev > 1.5:
            reasons.append({
                "code": "FRD_AMT_DEVIATION",
                "severity": "MEDIUM",
                "explanation": f"Amount is {amt_dev:.1f} std devs above user baseline",
                "metric_value": amt_dev,
            })
        
        # Novelty checks
        if features.get("new_merchant") == 1:
            reasons.append({
                "code": "FRD_MERCHANT_NEW",
                "severity": "MEDIUM",
                "explanation": "First transaction with this merchant",
            })
        
        if features.get("new_city") == 1:
            reasons.append({
                "code": "FRD_GEO_NEW_CITY",
                "severity": "MEDIUM",
                "explanation": "First transaction in this city",
            })
        
        if features.get("new_device") == 1:
            reasons.append({
                "code": "FRD_DEVICE_NEW",
                "severity": "LOW",
                "explanation": "First transaction from this device",
            })
        
        # Geo-mismatch check
        if features.get("geo_mismatch") == 1:
            reasons.append({
                "code": "FRD_GEO_MISMATCH",
                "severity": "CRITICAL",
                "explanation": "Geographic jump detected - significant location change in <4 hours (physically impossible travel)",
            })
        
        return reasons
    
    def _generate_fraud_summary(
        self,
        band: str,
        top_reasons: List[Dict[str, Any]]
    ) -> str:
        """Generate human-readable fraud summary."""
        if not top_reasons:
            return f"Transaction flagged as {band} fraud risk."
        
        reason_summaries = []
        for reason in top_reasons[:3]:
            reason_summaries.append(f"- {reason['explanation']}")
        
        reasons_text = "\n".join(reason_summaries)
        
        if band == "high":
            return f"Transaction FLAGGED as high fraud risk.\n\nKey concerns:\n{reasons_text}"
        elif band == "medium":
            return f"Transaction flagged as medium fraud risk.\n\nKey concerns:\n{reasons_text}"
        else:
            return f"Transaction shows low fraud risk.\n\nNotes:\n{reasons_text}"
    
    def _get_fraud_actions(self, top_reasons: List[Dict[str, Any]]) -> List[str]:
        """Generate suggested actions based on reasons."""
        actions = []
        
        reason_codes = [r["code"] for r in top_reasons]
        
        if "FRD_GEO_MISMATCH" in reason_codes:
            actions.append("URGENT: Contact customer to verify transaction - impossible geographic location")
        elif "FRD_VEL_HIGH" in reason_codes:
            actions.append("Verify rapid transaction pattern with customer")
        
        if "FRD_AMT_SPIKE" in reason_codes:
            actions.append("Review unusual transaction amount")
        
        if "FRD_MERCHANT_NEW" in reason_codes:
            actions.append("Verify new merchant transaction")
        
        if "FRD_GEO_NEW_CITY" in reason_codes:
            actions.append("Check geographic location consistency")
        
        if not actions:
            actions.append("Review transaction details")
        
        return actions[:3]  # Top 3 actions


class RiskExplainer:
    """Explains risk scoring predictions."""
    
    RISK_SEVERITY_MAP = {
        # CRITICAL
        "RISK_PAYMENT_LATE": "CRITICAL",
        "RISK_EMPLOYMENT_GAPS": "CRITICAL",
        "RISK_INCOME_LOW": "CRITICAL",
        # HIGH
        "RISK_SPEND_HIGH": "HIGH",
        "RISK_CREDIT_NEW": "HIGH",
        "RISK_EMPLOYMENT_SHORT": "HIGH",
        # MEDIUM
        "RISK_INCOME_VOLATILE": "MEDIUM",
        "RISK_SPEND_VOLATILE": "MEDIUM",
        "RISK_PROFILE_YOUNG": "MEDIUM",
        # LOW
        "RISK_PAYMENT_CLEAN": "LOW",
        "RISK_CREDIT_CLEAN": "LOW",
        "RISK_PROFILE_ESTABLISHED": "LOW",
    }
    
    def explain_prediction(
        self,
        subject_id: str,
        risk_score: float,
        risk_band: str,
        features: Dict[str, float],
    ) -> ExplanationReport:
        """
        Generate explanation for risk prediction.
        
        Args:
            subject_id: Subject/customer ID
            risk_score: Risk score 0-1
            risk_band: low/medium/high
            features: Feature values for this subject
        """
        # Extract reason codes from features
        reason_codes = self._extract_risk_reasons(features)
        
        # Sort by severity
        reason_codes.sort(
            key=lambda x: SeverityLevel[x["severity"]].value,
            reverse=True
        )
        
        primary_reason = reason_codes[0]["code"] if reason_codes else "UNKNOWN"
        supporting_reasons = reason_codes[1:4] if len(reason_codes) > 1 else []
        
        # Generate human-readable summary
        human_summary = self._generate_risk_summary(
            subject_id,
            risk_band,
            reason_codes[:3]
        )
        
        # Generate suggested actions
        suggested_actions = self._get_risk_actions(reason_codes[:3], risk_band)
        
        # Confidence based on feature strength
        confidence = min(0.95, 0.5 + (1 - abs(risk_score - 0.5) * 2) * 0.45)
        
        report = ExplanationReport(
            prediction_id=f"risk_{subject_id}_{datetime.now().timestamp()}",
            timestamp=datetime.now().isoformat(),
            subject_id=subject_id,
            model_type="risk",
            score=float(risk_score),
            band=risk_band,
            confidence=float(confidence),
            primary_reason_code=primary_reason,
            supporting_reasons=supporting_reasons,
            human_summary=human_summary,
            suggested_actions=suggested_actions,
        )
        
        return report
    
    def _extract_risk_reasons(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        """Extract reason codes from features."""
        reasons = []
        
        # Income analysis
        income = features.get("income_monthly", 0)
        if income < 20000:
            reasons.append({
                "code": "RISK_INCOME_LOW",
                "severity": "CRITICAL",
                "explanation": f"Monthly income ${income:,.0f} is below healthy baseline",
                "metric_value": income,
            })
        
        # Employment analysis
        emp_years = features.get("employment_years", 0)
        if emp_years < 2:
            reasons.append({
                "code": "RISK_EMPLOYMENT_SHORT",
                "severity": "HIGH",
                "explanation": f"Employment tenure {emp_years:.1f} years (< 2 years threshold)",
                "metric_value": emp_years,
            })
        
        # Credit history analysis
        credit_months = features.get("credit_history_months", 0)
        if credit_months < 6:
            reasons.append({
                "code": "RISK_CREDIT_NEW",
                "severity": "HIGH",
                "explanation": f"Limited credit history: only {credit_months:.0f} months established",
                "metric_value": credit_months,
            })
        elif credit_months > 60:
            reasons.append({
                "code": "RISK_CREDIT_CLEAN",
                "severity": "LOW",
                "explanation": f"Strong credit history: {credit_months:.0f} months established",
                "metric_value": credit_months,
            })
        
        # Payment behavior analysis
        late_payments = features.get("late_payments_12m", 0)
        has_late = features.get("has_late_payments", 0)
        if has_late == 1:
            reasons.append({
                "code": "RISK_PAYMENT_LATE",
                "severity": "CRITICAL",
                "explanation": f"Recent payment issues: {int(late_payments)} late payments in past 12 months",
                "metric_value": late_payments,
            })
        else:
            reasons.append({
                "code": "RISK_PAYMENT_CLEAN",
                "severity": "LOW",
                "explanation": "Clean payment history - no late payments in past 12 months",
            })
        
        # Spending analysis
        spend_ratio = features.get("spend_to_income_ratio", 0)
        if spend_ratio > 0.8:
            reasons.append({
                "code": "RISK_SPEND_HIGH",
                "severity": "HIGH",
                "explanation": f"High spending ratio: {spend_ratio:.1%} of income spent monthly",
                "metric_value": spend_ratio,
            })
        
        # Profile maturity
        emp_stability = features.get("employment_stability", 0)
        if emp_stability < 7:  # Less than 2 years cubed
            reasons.append({
                "code": "RISK_PROFILE_YOUNG",
                "severity": "MEDIUM",
                "explanation": "Overall credit profile is young and less established",
                "metric_value": emp_stability,
            })
        elif emp_stability > 100:
            reasons.append({
                "code": "RISK_PROFILE_ESTABLISHED",
                "severity": "LOW",
                "explanation": "Well-established credit profile with strong tenure",
                "metric_value": emp_stability,
            })
        
        return reasons
    
    def _generate_risk_summary(
        self,
        subject_id: str,
        band: str,
        top_reasons: List[Dict[str, Any]]
    ) -> str:
        """Generate human-readable risk summary."""
        band_text = {
            "low": "low",
            "medium": "moderate",
            "high": "high"
        }.get(band, band)
        
        if not top_reasons:
            return f"Subject {subject_id} assigned {band_text} credit risk rating."
        
        key_factors = []
        for reason in top_reasons[:3]:
            key_factors.append(f"- {reason['explanation']}")
        
        factors_text = "\n".join(key_factors)
        
        return f"Subject {subject_id} assigned {band_text} credit risk rating.\n\nKey factors:\n{factors_text}"
    
    def _get_risk_actions(
        self,
        top_reasons: List[Dict[str, Any]],
        band: str
    ) -> List[str]:
        """Generate suggested actions based on reasons."""
        actions = []
        reason_codes = [r["code"] for r in top_reasons]
        
        if band == "high":
            actions.append("RECOMMEND: Decline or require additional verification")
        elif band == "medium":
            actions.append("RECOMMEND: Standard underwriting process")
        else:
            actions.append("RECOMMEND: Approve with standard terms")
        
        if "RISK_PAYMENT_LATE" in reason_codes:
            actions.append("Discuss payment history and resolution")
        
        if "RISK_SPEND_HIGH" in reason_codes:
            actions.append("Review budget and affordability")
        
        if "RISK_EMPLOYMENT_SHORT" in reason_codes:
            actions.append("Verify employment stability")
        
        return actions[:3]


class ReportGenerator:
    """Generates JSON reports for predictions."""
    
    @staticmethod
    def to_json(report: ExplanationReport) -> str:
        """Convert report to JSON string."""
        report_dict = asdict(report)
        return json.dumps(report_dict, indent=2, default=str)
    
    @staticmethod
    def to_dict(report: ExplanationReport) -> Dict[str, Any]:
        """Convert report to dictionary."""
        return asdict(report)
    
    @staticmethod
    def save_report(report: ExplanationReport, filepath: str) -> None:
        """Save report to JSON file."""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(ReportGenerator.to_json(report))


def create_fraud_explanation(
    subject_id: str,
    fraud_score: float,
    fraud_band: str,
    features: Dict[str, float],
    baseline: Dict[str, float] = None,
) -> Dict[str, Any]:
    """Convenience function to generate fraud explanation."""
    explainer = FraudExplainer()
    report = explainer.explain_prediction(
        subject_id,
        fraud_score,
        fraud_band,
        features,
        baseline
    )
    return ReportGenerator.to_dict(report)


def create_risk_explanation(
    subject_id: str,
    risk_score: float,
    risk_band: str,
    features: Dict[str, float],
) -> Dict[str, Any]:
    """Convenience function to generate risk explanation."""
    explainer = RiskExplainer()
    report = explainer.explain_prediction(
        subject_id,
        risk_score,
        risk_band,
        features
    )
    return ReportGenerator.to_dict(report)


if __name__ == "__main__":
    # Example usage
    print("=" * 70)
    print("Phase 4: Transparency Engine - Example")
    print("=" * 70)
    
    # Fraud example
    print("\nFRAUD EXPLANATION EXAMPLE:")
    print("-" * 70)
    fraud_features = {
        "velocity": 5,
        "amount_deviation": 1.8,
        "new_merchant": 1,
        "new_city": 1,
        "new_device": 0,
        "geo_mismatch": 1,
    }
    fraud_report = create_fraud_explanation(
        "txn_12345",
        0.85,
        "high",
        fraud_features
    )
    print(json.dumps(fraud_report, indent=2))
    
    # Risk example
    print("\n\nRISK EXPLANATION EXAMPLE:")
    print("-" * 70)
    risk_features = {
        "income_monthly": 35000,
        "employment_years": 3.5,
        "credit_history_months": 24,
        "avg_monthly_spend": 28000,
        "late_payments_12m": 1,
        "spend_to_income_ratio": 0.8,
        "employment_stability": 12.5,
        "credit_to_employment_ratio": 0.57,
        "has_late_payments": 1,
    }
    risk_report = create_risk_explanation(
        "subj_67890",
        0.62,
        "medium",
        risk_features
    )
    print(json.dumps(risk_report, indent=2))
