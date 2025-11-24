"""
Data analyzer with correct calculation logic for poultry processing KPIs.
"""
from typing import List, Dict, Optional
from collections import defaultdict

class DataAnalyzer:
    """Analyze poultry processing data and perform accurate calculations"""
    
    def __init__(self):
        self.broiler_keywords = ['broiler', 'brc', 'bkt']
        self.breeder_keywords = ['breeder', 'brd']
     
    def calculate_row_metrics(self, raw_data_row: Dict) -> Dict:
        """
        Calculate all metrics for a single row.
        
        
        Key calculations:
        - Total Birds Arrived = D/O Quantity
        - Total Birds Slaughtered = TOTAL SLAUGHTER
        - Total DOA = DOA
        - Birds Arrived (Actual) = BIRD COUNTER + DOA
        - Missing Birds = D/O Quantity - (BIRD COUNTER + DOA)
        - Variance = (BIRD COUNTER + DOA) - D/O Quantity
        - Death Percentage = (DOA / D/O Quantity) * 100
        - Missing Birds Percentage = (Missing Birds / D/O Quantity) * 100
        - Variance Percentage = (Variance / D/O Quantity) * 100
        """
        do_quantity = raw_data_row.get('do_quantity') or 0
        bird_counter = raw_data_row.get('bird_counter') or 0
        total_slaughter = raw_data_row.get('total_slaughter') or 0
        doa = raw_data_row.get('doa') or 0
        
        # Birds arrived (actual count)
        birds_arrived_actual = bird_counter + doa
        
        # Missing birds (expected - actual)
        missing_birds = do_quantity - birds_arrived_actual
        
        # Variance (actual - expected)
        variance = birds_arrived_actual - do_quantity
        
        # Calculate percentages
        death_percentage = (doa / do_quantity * 100) if do_quantity > 0 else 0
        missing_percentage = (missing_birds / do_quantity * 100) if do_quantity > 0 else 0
        variance_percentage = (variance / do_quantity * 100) if do_quantity > 0 else 0
        
        return {
            'total_birds_arrived': do_quantity,
            'total_birds_slaughtered': total_slaughter,
            'total_doa': doa,
            'bird_counter': bird_counter,
            'birds_arrived_actual': birds_arrived_actual,
            'missing_birds': missing_birds,
            'variance': variance,
            'death_percentage': round(death_percentage, 2),
            'missing_birds_percentage': round(missing_percentage, 2),
            'variance_percentage': round(variance_percentage, 2),
            'remark': self._generate_remark(variance)
        }
    
    def _generate_remark(self, variance: int) -> Optional[str]:
        """Generate remark based on variance value"""
        if variance > 0:
            return f"Over by {variance}"
        elif variance < 0:
            return f"Short by {abs(variance)}"
        else:
            return "Match"
    
    def categorize_row(self, raw_data_row: Dict) -> str:
        """Auto-categorize row as Broiler or Breeder"""
        farm = str(raw_data_row.get('farm', '')).upper()
        truck_no = str(raw_data_row.get('truck_no', '')).upper()
        do_number = str(raw_data_row.get('do_number', '')).upper()
        
        # Check for breeder keywords
        for keyword in self.breeder_keywords:
            if keyword.upper() in farm or keyword.upper() in truck_no or keyword.upper() in do_number:
                return "Breeder"
        
        # Check for broiler keywords
        for keyword in self.broiler_keywords:
            if keyword.upper() in farm or keyword.upper() in truck_no or keyword.upper() in do_number:
                return "Broiler"
        
        # Default categorization
        if any(char.isdigit() for char in farm):
            if 'BRC' in farm or 'BR' in farm:
                return "Broiler"
        
        return "Broiler"
    
    def aggregate_by_truck(self, raw_data_list: List[Dict], calculations: List[Dict]) -> List[Dict]:
        """
        Aggregate data by truck number.
        Returns truck-wise performance metrics.
        """
        truck_data = defaultdict(lambda: {
            'truck_no': '',
            'serial_numbers': [],
            'total_birds_arrived': 0,
            'total_birds_slaughtered': 0,
            'total_doa': 0,
            'total_bird_counter': 0,
            'total_missing_birds': 0,
            'total_variance': 0,
            'row_count': 0
        })
        
        # Aggregate by truck
        for i, row in enumerate(raw_data_list):
            truck_no = row.get('truck_no') or 'Unknown'
            calc = calculations[i]
            
            truck_data[truck_no]['truck_no'] = truck_no
            truck_data[truck_no]['serial_numbers'].append(row.get('no'))
            truck_data[truck_no]['total_birds_arrived'] += calc.get('total_birds_arrived', 0)
            truck_data[truck_no]['total_birds_slaughtered'] += calc.get('total_birds_slaughtered', 0)
            truck_data[truck_no]['total_doa'] += calc.get('total_doa', 0)
            truck_data[truck_no]['total_bird_counter'] += calc.get('bird_counter', 0)
            truck_data[truck_no]['total_missing_birds'] += calc.get('missing_birds', 0)
            truck_data[truck_no]['total_variance'] += calc.get('variance', 0)
            truck_data[truck_no]['row_count'] += 1
        
        # Calculate truck-wise KPIs
        truck_results = []
        for truck_no, data in truck_data.items():
            total_arrived = data['total_birds_arrived']
            
            # Calculate percentages
            death_percentage = (data['total_doa'] / total_arrived * 100) if total_arrived > 0 else 0
            missing_percentage = (data['total_missing_birds'] / total_arrived * 100) if total_arrived > 0 else 0
            variance_percentage = (data['total_variance'] / total_arrived * 100) if total_arrived > 0 else 0
            
            truck_results.append({
                'truck_no': truck_no,
                'serial_numbers': sorted([s for s in data['serial_numbers'] if s]),
                'total_birds_arrived': total_arrived,
                'total_birds_slaughtered': data['total_birds_slaughtered'],
                'total_doa': data['total_doa'],
                'total_bird_counter': data['total_bird_counter'],
                'total_missing_birds': data['total_missing_birds'],
                'total_variance': data['total_variance'],
                'death_percentage': round(death_percentage, 2),
                'missing_birds_percentage': round(missing_percentage, 2),
                'variance_percentage': round(variance_percentage, 2),
                'row_count': data['row_count']
            })
        
        # Sort by truck number
        truck_results.sort(key=lambda x: x['truck_no'])
        return truck_results
    
    def aggregate_by_farm(self, raw_data_list: List[Dict], calculations: List[Dict]) -> List[Dict]:
        """
        Aggregate data by farm.
        Returns farm-wise performance metrics.
        """
        farm_data = defaultdict(lambda: {
            'farm': '',
            'total_birds_arrived': 0,
            'total_birds_slaughtered': 0,
            'total_doa': 0,
            'total_missing_birds': 0,
            'total_variance': 0,
            'row_count': 0
        })
        
        # Aggregate by farm
        for i, row in enumerate(raw_data_list):
            farm = row.get('farm') or 'Unknown'
            calc = calculations[i]
            
            farm_data[farm]['farm'] = farm
            farm_data[farm]['total_birds_arrived'] += calc.get('total_birds_arrived', 0)
            farm_data[farm]['total_birds_slaughtered'] += calc.get('total_birds_slaughtered', 0)
            farm_data[farm]['total_doa'] += calc.get('total_doa', 0)
            farm_data[farm]['total_missing_birds'] += calc.get('missing_birds', 0)
            farm_data[farm]['total_variance'] += calc.get('variance', 0)
            farm_data[farm]['row_count'] += 1
        
        # Calculate farm-wise KPIs
        farm_results = []
        for farm, data in farm_data.items():
            total_arrived = data['total_birds_arrived']
            
            # Calculate percentages
            death_percentage = (data['total_doa'] / total_arrived * 100) if total_arrived > 0 else 0
            missing_percentage = (data['total_missing_birds'] / total_arrived * 100) if total_arrived > 0 else 0
            variance_percentage = (data['total_variance'] / total_arrived * 100) if total_arrived > 0 else 0
            
            farm_results.append({
                'farm': farm,
                'total_birds_arrived': total_arrived,
                'total_birds_slaughtered': data['total_birds_slaughtered'],
                'total_doa': data['total_doa'],
                'total_missing_birds': data['total_missing_birds'],
                'total_variance': data['total_variance'],
                'death_percentage': round(death_percentage, 2),
                'missing_birds_percentage': round(missing_percentage, 2),
                'variance_percentage': round(variance_percentage, 2),
                'row_count': data['row_count']
            })
        
        # Sort by farm name
        farm_results.sort(key=lambda x: x['farm'])
        return farm_results
    
    def process_raw_data(self, raw_data_list: List[Dict]) -> tuple:
        """
        Process all raw data rows and generate calculations.
        
        Returns:
            Tuple of (calculations_list, category_counts)
        """
        calculations = []
        category_counts = {'Broiler': 0, 'Breeder': 0}
        
        for row in raw_data_list:
            # Calculate metrics
            calc = self.calculate_row_metrics(row)
            calc['raw_data_row'] = row
            calculations.append(calc)
            
            # Categorize
            category = self.categorize_row(row)
            category_counts[category] += 1
        
        return calculations, category_counts
    
    def generate_summaries(self, raw_data_list: List[Dict], calculations: List[Dict]) -> List[Dict]:
        """Generate summaries by category (Broiler/Breeder)"""
        broiler_data = {
            'total_birds_arrived': 0,
            'total_birds_slaughtered': 0,
            'total_doa': 0,
            'total_missing_birds': 0,
            'total_variance': 0
        }
        
        breeder_data = {
            'total_birds_arrived': 0,
            'total_birds_slaughtered': 0,
            'total_doa': 0,
            'total_missing_birds': 0,
            'total_variance': 0
        }
        
        # Aggregate data by category
        for i, row in enumerate(raw_data_list):
            category = self.categorize_row(row)
            calc = calculations[i]
            
            if category == "Broiler":
                broiler_data['total_birds_arrived'] += calc.get('total_birds_arrived', 0)
                broiler_data['total_birds_slaughtered'] += calc.get('total_birds_slaughtered', 0)
                broiler_data['total_doa'] += calc.get('total_doa', 0)
                broiler_data['total_missing_birds'] += calc.get('missing_birds', 0)
                broiler_data['total_variance'] += calc.get('variance', 0)
            elif category == "Breeder":
                breeder_data['total_birds_arrived'] += calc.get('total_birds_arrived', 0)
                breeder_data['total_birds_slaughtered'] += calc.get('total_birds_slaughtered', 0)
                breeder_data['total_doa'] += calc.get('total_doa', 0)
                breeder_data['total_missing_birds'] += calc.get('missing_birds', 0)
                breeder_data['total_variance'] += calc.get('variance', 0)
        
        # Calculate percentages for summaries
        broiler_arrived = broiler_data['total_birds_arrived']
        breeder_arrived = breeder_data['total_birds_arrived']
        
        summaries = [
            {
                'category': 'Broiler',
                'total_birds_arrived': broiler_arrived,
                'total_birds_slaughtered': broiler_data['total_birds_slaughtered'],
                'total_doa': broiler_data['total_doa'],
                'total_missing_birds': broiler_data['total_missing_birds'],
                'total_variance': broiler_data['total_variance'],
                'death_percentage': round((broiler_data['total_doa'] / broiler_arrived * 100) if broiler_arrived > 0 else 0, 2),
                'missing_percentage': round((broiler_data['total_missing_birds'] / broiler_arrived * 100) if broiler_arrived > 0 else 0, 2),
                'variance_percentage': round((broiler_data['total_variance'] / broiler_arrived * 100) if broiler_arrived > 0 else 0, 2)
            },
            {
                'category': 'Breeder',
                'total_birds_arrived': breeder_arrived,
                'total_birds_slaughtered': breeder_data['total_birds_slaughtered'],
                'total_doa': breeder_data['total_doa'],
                'total_missing_birds': breeder_data['total_missing_birds'],
                'total_variance': breeder_data['total_variance'],
                'death_percentage': round((breeder_data['total_doa'] / breeder_arrived * 100) if breeder_arrived > 0 else 0, 2),
                'missing_percentage': round((breeder_data['total_missing_birds'] / breeder_arrived * 100) if breeder_arrived > 0 else 0, 2),
                'variance_percentage': round((breeder_data['total_variance'] / breeder_arrived * 100) if breeder_arrived > 0 else 0, 2)
            }
        ]
        
        return summaries
    
    def calculate_grand_total(self, raw_data_list: List[Dict], calculations: List[Dict]) -> Dict:
        """Calculate grand totals for all data"""
        grand_total = {
            'total_birds_arrived': 0,
            'total_birds_slaughtered': 0,
            'total_doa': 0,
            'total_bird_counter': 0,
            'total_missing_birds': 0,
            'total_variance': 0
        }
        
        for row in raw_data_list:
            grand_total['total_birds_arrived'] += row.get('do_quantity', 0) or 0
        
        for calc in calculations:
            grand_total['total_birds_slaughtered'] += calc.get('total_birds_slaughtered', 0) or 0
            grand_total['total_doa'] += calc.get('total_doa', 0) or 0
            grand_total['total_bird_counter'] += calc.get('bird_counter', 0) or 0
            grand_total['total_missing_birds'] += calc.get('missing_birds', 0) or 0
            grand_total['total_variance'] += calc.get('variance', 0) or 0
        
        # Calculate overall percentages
        total_arrived = grand_total['total_birds_arrived']
        grand_total['death_percentage'] = round((grand_total['total_doa'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
        grand_total['missing_percentage'] = round((grand_total['total_missing_birds'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
        grand_total['variance_percentage'] = round((grand_total['total_variance'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
        
        return grand_total
    
    def calculate_overall_summary(self, raw_data_list: List[Dict], calculations: List[Dict]) -> Dict:
        """
        Calculate the 8 new overall KPIs:
        1. Total Delivered (D/O Quantity) = SUM(D/O Quantity)
        2. Total Birds Counted (Counter + DOA) = SUM(BIRD COUNTER + DOA)
        3. Net Difference = SUM(Counter + DOA - D/O Quantity)
        4. Total DOA = SUM(DOA)
        5. DOA % = (SUM(DOA) / SUM(Counter + DOA)) × 100
        6. Total Slaughter = SUM(TOTAL SLAUGHTER)
        7. Slaughter Yield % = (SUM(TOTAL SLAUGHTER) / SUM(Counter + DOA)) × 100
        8. Total Non-Halal = SUM(Non-Halal)
        """
        total_delivered = 0
        total_birds_counted = 0  # Counter + DOA
        total_doa = 0
        total_slaughter = 0
        total_non_halal = 0
        
        for row in raw_data_list:
            total_delivered += row.get('do_quantity', 0) or 0
            total_non_halal += row.get('non_halal', 0) or 0
        
        for calc in calculations:
            total_doa += calc.get('total_doa', 0) or 0
            total_slaughter += calc.get('total_birds_slaughtered', 0) or 0
            bird_counter = calc.get('bird_counter', 0) or 0
            doa = calc.get('total_doa', 0) or 0
            total_birds_counted += (bird_counter + doa)
        
        # Net Difference = SUM(Counter + DOA) - SUM(D/O Quantity)
        net_difference = total_birds_counted - total_delivered
        
        # DOA % = (SUM(DOA) / SUM(Counter + DOA)) × 100
        doa_percentage = (total_doa / total_birds_counted * 100) if total_birds_counted > 0 else 0
        
        # Slaughter Yield % = (SUM(TOTAL SLAUGHTER) / SUM(Counter + DOA)) × 100
        slaughter_yield_percentage = (total_slaughter / total_birds_counted * 100) if total_birds_counted > 0 else 0
        
        return {
            'total_delivered': total_delivered,
            'total_birds_counted': total_birds_counted,
            'net_difference': net_difference,
            'total_doa': total_doa,
            'doa_percentage': round(doa_percentage, 2),
            'total_slaughter': total_slaughter,
            'slaughter_yield_percentage': round(slaughter_yield_percentage, 2),
            'total_non_halal': total_non_halal
        }
    
    def generate_historical_trends(self, raw_data_list: List[Dict], calculations: List[Dict]) -> List[Dict]:
        """
        Generate historical trend data for farms and D/O numbers.
        Returns list of trend records with difference, do_quantity, counter_plus_doa, and slaughter_yield_percentage.
        """
        trends = []
        
        for i, row in enumerate(raw_data_list):
            calc = calculations[i]
            do_quantity = row.get('do_quantity', 0) or 0
            bird_counter = calc.get('bird_counter', 0) or 0
            doa = calc.get('total_doa', 0) or 0
            total_slaughter = calc.get('total_birds_slaughtered', 0) or 0
            counter_plus_doa = bird_counter + doa
            
            # Difference = D/O Quantity - (Counter + DOA)
            difference = do_quantity - counter_plus_doa
            
            # Slaughter Yield % = (TOTAL SLAUGHTER / (Counter + DOA)) × 100
            slaughter_yield_percentage = (total_slaughter / counter_plus_doa * 100) if counter_plus_doa > 0 else 0
            
            trends.append({
                'farm': row.get('farm'),
                'do_number': row.get('do_number'),
                'difference': difference,
                'do_quantity': do_quantity,
                'counter_plus_doa': counter_plus_doa,
                'slaughter_yield_percentage': round(slaughter_yield_percentage, 2)
            })
        
        return trends
    
    def get_delivered_vs_received_by_farm(self, raw_data_list: List[Dict], calculations: List[Dict]) -> List[Dict]:
        """
        Get delivered vs received comparison by farm.
        Returns list with: Farm, Total D/O Quantity (delivered), Total Received (Counter + DOA)
        """
        farm_data = defaultdict(lambda: {
            'farm': '',
            'total_do_quantity': 0,
            'total_received': 0
        })
        
        for i, row in enumerate(raw_data_list):
            farm = row.get('farm') or 'Unknown'
            calc = calculations[i]
            
            farm_data[farm]['farm'] = farm
            farm_data[farm]['total_do_quantity'] += row.get('do_quantity', 0) or 0
            bird_counter = calc.get('bird_counter', 0) or 0
            doa = calc.get('total_doa', 0) or 0
            farm_data[farm]['total_received'] += (bird_counter + doa)
        
        result = []
        for farm, data in farm_data.items():
            result.append({
                'farm': data['farm'],
                'total_do_quantity': data['total_do_quantity'],
                'total_received': data['total_received'],
                'difference': data['total_received'] - data['total_do_quantity']
            })
        
        result.sort(key=lambda x: x['farm'])
        return result
    
    def get_slaughter_yield_by_farm(self, raw_data_list: List[Dict], calculations: List[Dict]) -> List[Dict]:
        """
        Get slaughter yield percentage by farm.
        Returns list with: Farm, Slaughter Yield % = (SUM(TOTAL SLAUGHTER) / SUM(Counter + DOA)) × 100
        """
        farm_data = defaultdict(lambda: {
            'farm': '',
            'total_slaughter': 0,
            'total_counter_plus_doa': 0
        })
        
        for i, row in enumerate(raw_data_list):
            farm = row.get('farm') or 'Unknown'
            calc = calculations[i]
            
            farm_data[farm]['farm'] = farm
            farm_data[farm]['total_slaughter'] += calc.get('total_birds_slaughtered', 0) or 0
            bird_counter = calc.get('bird_counter', 0) or 0
            doa = calc.get('total_doa', 0) or 0
            farm_data[farm]['total_counter_plus_doa'] += (bird_counter + doa)
        
        result = []
        for farm, data in farm_data.items():
            slaughter_yield = (data['total_slaughter'] / data['total_counter_plus_doa'] * 100) if data['total_counter_plus_doa'] > 0 else 0
            result.append({
                'farm': data['farm'],
                'slaughter_yield_percentage': round(slaughter_yield, 2),
                'total_slaughter': data['total_slaughter'],
                'total_counter_plus_doa': data['total_counter_plus_doa']
            })
        
        # Sort by slaughter yield percentage (lowest first for highlighting)
        result.sort(key=lambda x: x['slaughter_yield_percentage'])
        return result


def analyze_data(raw_data_list: List[Dict]) -> Dict:
    """
    Main function to analyze data and return all processed results.
    
    Returns:
        Dictionary with calculations, summaries, truck_data, farm_data, and grand_total
    """
    analyzer = DataAnalyzer()
    
    # Process raw data
    calculations, category_counts = analyzer.process_raw_data(raw_data_list)
    
    # Generate summaries
    summaries = analyzer.generate_summaries(raw_data_list, calculations)
    
    # Aggregate by truck
    truck_data = analyzer.aggregate_by_truck(raw_data_list, calculations)
    
    # Aggregate by farm
    farm_data = analyzer.aggregate_by_farm(raw_data_list, calculations)
    
    # Calculate grand total
    grand_total = analyzer.calculate_grand_total(raw_data_list, calculations)
    
    # Calculate overall summary (8 new KPIs)
    overall_summary = analyzer.calculate_overall_summary(raw_data_list, calculations)
    
    # Generate historical trends
    historical_trends = analyzer.generate_historical_trends(raw_data_list, calculations)
    
    # Get delivered vs received by farm
    delivered_vs_received = analyzer.get_delivered_vs_received_by_farm(raw_data_list, calculations)
    
    # Get slaughter yield by farm
    slaughter_yield_by_farm = analyzer.get_slaughter_yield_by_farm(raw_data_list, calculations)
    
    return {
        'calculations': calculations,
        'summaries': summaries,
        'category_counts': category_counts,
        'truck_data': truck_data,
        'farm_data': farm_data,
        'grand_total': grand_total,
        'overall_summary': overall_summary,
        'historical_trends': historical_trends,
        'delivered_vs_received': delivered_vs_received,
        'slaughter_yield_by_farm': slaughter_yield_by_farm
    }
