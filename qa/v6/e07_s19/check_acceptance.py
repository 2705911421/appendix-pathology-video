import json
from pathlib import Path
p=Path(__file__).resolve().parent
m=json.loads((p/'cell_measurements.json').read_text());d=json.loads((p/'density_measurements.json').read_text())
for key in ['e07_s70_lymph','e07_s69_fibrosis']:
 for kind,err in d[key]['relative_error'].items():assert abs(err)<=.25,(key,kind,err)
for key,err in m['error_fraction'].items():assert abs(err)<=.15,(key,err)
for axis in ['long_px','short_px']:
 assert abs(m['e07_fibrosis_small']['mean_'+axis]/m['lymph_mean'][axis]-1)<=.15
print('Density ±25% and isolated small-nucleus mean size ±15%: PASS')
assert abs(m['e07_spindle']['mean_long_px']/m['spindle_mean']['long_px']-1)<=.15
print('Spindle bbox mean long-axis ±15%: PASS')
