"""AVL audit service with one clear responsibility: validate AVL integrity."""


class AVLNodeValidator:
    """Validate one AVL node."""
    
    def validate_node(self, node, calculated_height, parent_height=None):
        """Validate one node against AVL and BST ordering rules."""
        if node is None:
            return {"valid": True}
        
        issues = []
        
        # Rule 1: balance factor must stay in [-1, 0, 1].
        balance_factor = self._calculate_balance_factor(node)
        if balance_factor < -1 or balance_factor > 1:
            issues.append({
                "type": "balance_factor",
                "severity": "critical",
                "message": f"Balance factor is out of range: {balance_factor}",
                "expected": "[-1, 0, 1]",
                "actual": balance_factor
            })
        
        # Rule 2: BST ordering must hold (left < node < right).
        left_child = node.getLeftChild()
        right_child = node.getRightChild()
        
        if left_child and self._compare_values(left_child.getValue(), node.getValue()) >= 0:
            issues.append({
                "type": "bst_violation_left",
                "severity": "critical",
                "message": f"Left child ({left_child.getValue()}) >= node ({node.getValue()})",
                "location": "left_child"
            })
        
        if right_child and self._compare_values(right_child.getValue(), node.getValue()) <= 0:
            issues.append({
                "type": "bst_violation_right",
                "severity": "critical",
                "message": f"Right child ({right_child.getValue()}) <= node ({node.getValue()})",
                "location": "right_child"
            })
        
        return {
            "valid": len(issues) == 0,
            "balance_factor": balance_factor,
            "height": calculated_height,
            "issues": issues
        }
    
    def _calculate_balance_factor(self, node):
        """Compute balance factor: left_height - right_height."""
        if node is None:
            return 0
        
        left_height = self._get_height(node.getLeftChild())
        right_height = self._get_height(node.getRightChild())
        return left_height - right_height
    
    def _get_height(self, node):
        """Return node height."""
        if node is None:
            return 0
        return 1 + max(self._get_height(node.getLeftChild()), 
                      self._get_height(node.getRightChild()))

    def _compare_values(self, left, right):
        """Compare node values with one consistent sort strategy."""
        left_key = self._value_sort_key(left)
        right_key = self._value_sort_key(right)

        if left_key < right_key:
            return -1
        if left_key > right_key:
            return 1
        return 0

    def _value_sort_key(self, value):
        if isinstance(value, (int, float)):
            return (0, float(value), str(value))

        if isinstance(value, str):
            stripped = value.strip()
            if stripped.lstrip("-").isdigit():
                return (0, float(int(stripped)), stripped)
            return (1, stripped, stripped)

        return (2, str(value), str(value))


class AVLAuditService:
    """Run full AVL audits and build readable reports."""
    
    def __init__(self, node_validator=None):
        """Allow custom validators through dependency injection."""
        self.validator = node_validator or AVLNodeValidator()
    
    def audit_tree(self, root):
        """Run full tree audit and return structured details."""
        if root is None:
            return {
                "isValid": True,
                "summary": {
                    "totalNodes": 0,
                    "inconsistentNodes": 0,
                    "criticalIssues": 0,
                    "majorIssues": 0,
                    "severity": "ok"
                },
                "nodes": [],
                "criticalIssues": [],
                "majorIssues": [],
                "allIssues": []
            }
        
        nodes_data = []
        all_issues = []
        
        # Traverse full tree with DFS.
        self._traverse_and_validate(
            root, 
            nodes_data, 
            all_issues,
            depth=0
        )
        
        # Split issues by severity.
        critical_issues = [i for i in all_issues if i.get("severity") == "critical"]
        major_issues = [i for i in all_issues if i.get("severity") == "major"]
        
        # Build final summary.
        return {
            "isValid": len(critical_issues) == 0,
            "summary": {
                "totalNodes": len(nodes_data),
                "inconsistentNodes": len([n for n in nodes_data if not n["valid"]]),
                "criticalIssues": len(critical_issues),
                "majorIssues": len(major_issues),
                "severity": self._calculate_overall_severity(critical_issues, major_issues)
            },
            "nodes": nodes_data,
            "criticalIssues": critical_issues,
            "majorIssues": major_issues,
            "allIssues": all_issues
        }
    
    def _traverse_and_validate(self, node, nodes_data, all_issues, depth=0):
        """Traverse tree in DFS order and validate each node."""
        if node is None:
            return -1
        
        # Validate children first (post-order).
        left_height = self._traverse_and_validate(
            node.getLeftChild(), 
            nodes_data, 
            all_issues, 
            depth + 1
        )
        
        right_height = self._traverse_and_validate(
            node.getRightChild(), 
            nodes_data, 
            all_issues, 
            depth + 1
        )
        
        # Compute expected height.
        expected_height = 1 + max(left_height, right_height)
        
        # Validate current node.
        validation = self.validator.validate_node(node, expected_height)
        
        # Build node report.
        node_info = {
            "codigo": node.codigo,
            "value": node.getValue(),
            "depth": depth,
            "height": expected_height,
            "balanceFactor": validation["balance_factor"],
            "valid": validation["valid"],
            "issues": validation["issues"],
            "leftChild": node.getLeftChild().codigo if node.getLeftChild() else None,
            "rightChild": node.getRightChild().codigo if node.getRightChild() else None,
            "metadata": {
                "origen": node.origen,
                "destino": node.destino,
                "pasajeros": node.pasajeros,
                "precioBase": node.precioBase
            }
        }
        
        nodes_data.append(node_info)
        all_issues.extend([
            {**issue, "nodo": node.codigo}
            for issue in validation["issues"]
        ])
        
        return expected_height
    
    def _calculate_overall_severity(self, critical, major):
        """Return overall severity level."""
        if len(critical) > 0:
            return "critical"
        elif len(major) > 0:
            return "major"
        return "ok"
    
    def get_audit_report_summary(self, audit_result):
        """Convert detailed audit result into compact API report."""
        summary = audit_result["summary"]
        
        return {
            "status": "VÁLIDO" if audit_result["isValid"] else "INVÁLIDO",
            "statusText": "VALID" if audit_result["isValid"] else "INVALID",
            "resumen": {
                "totalNodos": summary["totalNodes"],
                "nodosInconsistentes": summary["inconsistentNodes"],
                "problemascríticos": summary["criticalIssues"],
                "problemasImportantes": summary["majorIssues"],
                "severidad": summary.get("severity", "unknown")
            },
            "summary": {
                "totalNodes": summary["totalNodes"],
                "inconsistentNodes": summary["inconsistentNodes"],
                "criticalIssues": summary["criticalIssues"],
                "majorIssues": summary["majorIssues"],
                "severity": summary.get("severity", "unknown"),
            },
            "nodosAuditados": audit_result["nodes"],
            "auditedNodes": audit_result["nodes"],
            "problemasEncontrados": audit_result["allIssues"],
            "issues": audit_result["allIssues"],
        }
