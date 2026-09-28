-- =====================================================================
-- Seed data for the State Government Infrastructure Asset Management System
-- Run AFTER schema.sql, and AFTER creating the two demo auth users
-- (see README -> "Demo accounts").
--
-- The script is idempotent: running it twice will not duplicate rows.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Departments
-- ---------------------------------------------------------------------
insert into public.departments (code, name) values
  ('RT',  'Roads & Transport'),
  ('HLT', 'Healthcare'),
  ('WR',  'Water Resources'),
  ('EDU', 'Education')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 2. Districts
-- ---------------------------------------------------------------------
insert into public.districts (name, state) values
  ('Ahmedabad', 'Gujarat'),
  ('Surat',     'Gujarat'),
  ('Vadodara',  'Gujarat'),
  ('Rajkot',    'Gujarat'),
  ('Bhavnagar', 'Gujarat')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- 3. Asset classes, with their class-specific attribute schemas
-- ---------------------------------------------------------------------
insert into public.asset_classes (department_id, code, name, attribute_schema)
select d.id, v.code, v.name, v.attribute_schema
from (values
  ('RT', 'HIGHWAY', 'Highway', '[
     {"key":"length_km","label":"Length (km)","type":"number","required":true},
     {"key":"lanes","label":"Number of Lanes","type":"number","required":true},
     {"key":"surface_type","label":"Surface Type","type":"select","required":true,
      "options":["Bituminous","Concrete","Gravel"]},
     {"key":"speed_limit_kmph","label":"Speed Limit (km/h)","type":"number","required":false}
   ]'::jsonb),
  ('RT', 'BRIDGE', 'Bridge', '[
     {"key":"span_m","label":"Span (m)","type":"number","required":true},
     {"key":"lanes","label":"Number of Lanes","type":"number","required":true},
     {"key":"structure_type","label":"Structure Type","type":"select","required":false,
      "options":["Girder","Arch","Cable-stayed","Suspension"]},
     {"key":"load_capacity_tonnes","label":"Load Capacity (tonnes)","type":"number","required":false}
   ]'::jsonb),
  ('HLT', 'HOSPITAL', 'Hospital', '[
     {"key":"beds","label":"Number of Beds","type":"number","required":true},
     {"key":"floors","label":"Number of Floors","type":"number","required":true},
     {"key":"built_up_area_sqm","label":"Built-up Area (sq m)","type":"number","required":false},
     {"key":"emergency_facility","label":"Emergency Facility","type":"boolean","required":false}
   ]'::jsonb),
  ('HLT', 'PHC', 'Primary Health Centre', '[
     {"key":"beds","label":"Number of Beds","type":"number","required":true},
     {"key":"doctors_sanctioned","label":"Sanctioned Doctor Posts","type":"number","required":false},
     {"key":"has_ambulance","label":"Ambulance Available","type":"boolean","required":false}
   ]'::jsonb),
  ('WR', 'CANAL', 'Canal', '[
     {"key":"length_km","label":"Length (km)","type":"number","required":true},
     {"key":"discharge_cumecs","label":"Design Discharge (cumecs)","type":"number","required":false},
     {"key":"lining_type","label":"Lining Type","type":"select","required":false,
      "options":["Unlined","Concrete","Brick"]}
   ]'::jsonb),
  ('EDU', 'SCHOOL', 'School Building', '[
     {"key":"classrooms","label":"Number of Classrooms","type":"number","required":true},
     {"key":"floors","label":"Number of Floors","type":"number","required":false},
     {"key":"student_capacity","label":"Student Capacity","type":"number","required":false},
     {"key":"has_laboratory","label":"Laboratory Available","type":"boolean","required":false}
   ]'::jsonb)
) as v(dept_code, code, name, attribute_schema)
join public.departments d on d.code = v.dept_code
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- 4. Sample assets
-- ---------------------------------------------------------------------
insert into public.assets (
  asset_code, name, department_id, asset_class_id, district_id,
  location, latitude, longitude, lifecycle_status, condition,
  commissioned_on, expected_lifetime_years, cost, responsible_officer, description
)
select
  v.asset_code, v.name,
  ac.department_id, ac.id, di.id,
  v.location, v.lat, v.lng,
  v.lifecycle::public.lifecycle_status,
  v.cond::public.condition_rating,
  v.commissioned_on::date, v.lifetime, v.cost, v.officer, v.description
from (values
  ('RT-HW-0001', 'NH-48 Section A (Ahmedabad Bypass)', 'HIGHWAY', 'Ahmedabad',
   'Sarkhej to Sanand stretch', 22.998000, 72.482000, 'Operational', 'Good',
   '2015-04-12', 30, 480000000.00, 'Er. R. K. Patel',
   'Four-lane bituminous section of NH-48 forming the western bypass.'),
  ('RT-HW-0002', 'SH-41 Rajkot–Gondal Road', 'HIGHWAY', 'Rajkot',
   'Rajkot city limit to Gondal', 22.220000, 70.830000, 'Under Maintenance', 'Poor',
   '2009-08-01', 25, 210000000.00, 'Er. M. J. Solanki',
   'State highway currently undergoing resurfacing of the carriageway.'),
  ('RT-BR-0001', 'Tapi River Bridge, Surat', 'BRIDGE', 'Surat',
   'Adajan to Rander crossing', 21.190000, 72.800000, 'Operational', 'Fair',
   '2011-11-20', 50, 860000000.00, 'Er. S. D. Chauhan',
   'Six-lane girder bridge across the Tapi river.'),
  ('RT-BR-0002', 'Vishwamitri Rail Overbridge', 'BRIDGE', 'Vadodara',
   'Near Vadodara Junction', 22.310000, 73.180000, 'Under Construction', 'Good',
   '2024-02-15', 50, 540000000.00, 'Er. P. N. Desai',
   'Replacement overbridge; construction in progress.'),
  ('HLT-HOS-0001', 'Civil Hospital Ahmedabad', 'HOSPITAL', 'Ahmedabad',
   'Asarwa', 23.052000, 72.605000, 'Operational', 'Good',
   '1998-06-30', 60, 1250000000.00, 'Dr. A. V. Mehta',
   'Tertiary care teaching hospital attached to the medical college.'),
  ('HLT-HOS-0002', 'District Hospital Bhavnagar', 'HOSPITAL', 'Bhavnagar',
   'Sardarnagar', 21.762000, 72.150000, 'Operational', 'Critical',
   '1987-01-10', 60, 390000000.00, 'Dr. K. S. Jadeja',
   'District level hospital; structural audit has flagged the east wing.'),
  ('HLT-PHC-0001', 'PHC Sanand', 'PHC', 'Ahmedabad',
   'Sanand taluka headquarters', 22.988000, 72.382000, 'Operational', 'Fair',
   '2012-09-05', 40, 42000000.00, 'Dr. N. B. Rathod',
   'Primary health centre serving twelve surrounding villages.'),
  ('WR-CAN-0001', 'Narmada Branch Canal – Rajkot Feeder', 'CANAL', 'Rajkot',
   'Maliya to Rajkot alignment', 22.430000, 70.760000, 'Operational', 'Good',
   '2006-03-18', 75, 730000000.00, 'Er. H. R. Vaghela',
   'Concrete lined irrigation branch canal.'),
  ('WR-CAN-0002', 'Kakrapar Left Bank Canal', 'CANAL', 'Surat',
   'Kakrapar weir to Kamrej', 21.310000, 73.290000, 'Retired', 'Poor',
   '1974-05-01', 60, 180000000.00, 'Er. D. L. Patel',
   'Superseded by the realigned canal; retained pending decommissioning.'),
  ('EDU-SCH-0001', 'Government Higher Secondary School, Vadodara', 'SCHOOL', 'Vadodara',
   'Karelibaug', 22.330000, 73.200000, 'Operational', 'Good',
   '2003-07-01', 50, 95000000.00, 'Shri V. P. Joshi',
   'Higher secondary school building with science laboratories.'),
  ('EDU-SCH-0002', 'Government Primary School, Gondal', 'SCHOOL', 'Rajkot',
   'Gondal town, ward 4', 21.960000, 70.800000, 'Planned', 'Good',
   null, 50, 38000000.00, 'Shri B. K. Trivedi',
   'New primary school building sanctioned for the current financial year.'),
  ('HLT-PHC-0002', 'PHC Palitana', 'PHC', 'Bhavnagar',
   'Palitana taluka', 21.520000, 71.820000, 'Under Maintenance', 'Poor',
   '2010-12-11', 40, 36000000.00, 'Dr. R. M. Bhatt',
   'Roof waterproofing and electrical rewiring under way.')
) as v(asset_code, name, class_code, district_name, location, lat, lng,
       lifecycle, cond, commissioned_on, lifetime, cost, officer, description)
join public.asset_classes ac on ac.code = v.class_code
join public.districts di on di.name = v.district_name
on conflict (asset_code) do nothing;

-- ---------------------------------------------------------------------
-- 5. Class-specific attributes for the sample assets
-- ---------------------------------------------------------------------
insert into public.asset_attributes (asset_id, attributes)
select a.id, v.attributes
from (values
  ('RT-HW-0001',   '{"length_km":28.4,"lanes":4,"surface_type":"Bituminous","speed_limit_kmph":100}'::jsonb),
  ('RT-HW-0002',   '{"length_km":38.0,"lanes":2,"surface_type":"Bituminous","speed_limit_kmph":80}'::jsonb),
  ('RT-BR-0001',   '{"span_m":1260,"lanes":6,"structure_type":"Girder","load_capacity_tonnes":70}'::jsonb),
  ('RT-BR-0002',   '{"span_m":420,"lanes":4,"structure_type":"Girder","load_capacity_tonnes":55}'::jsonb),
  ('HLT-HOS-0001', '{"beds":1200,"floors":8,"built_up_area_sqm":64000,"emergency_facility":true}'::jsonb),
  ('HLT-HOS-0002', '{"beds":320,"floors":4,"built_up_area_sqm":18500,"emergency_facility":true}'::jsonb),
  ('HLT-PHC-0001', '{"beds":30,"doctors_sanctioned":4,"has_ambulance":true}'::jsonb),
  ('HLT-PHC-0002', '{"beds":20,"doctors_sanctioned":3,"has_ambulance":false}'::jsonb),
  ('WR-CAN-0001',  '{"length_km":112.5,"discharge_cumecs":48,"lining_type":"Concrete"}'::jsonb),
  ('WR-CAN-0002',  '{"length_km":64.0,"discharge_cumecs":22,"lining_type":"Unlined"}'::jsonb),
  ('EDU-SCH-0001', '{"classrooms":32,"floors":3,"student_capacity":1400,"has_laboratory":true}'::jsonb),
  ('EDU-SCH-0002', '{"classrooms":12,"floors":1,"student_capacity":400,"has_laboratory":false}'::jsonb)
) as v(asset_code, attributes)
join public.assets a on a.asset_code = v.asset_code
on conflict (asset_id) do nothing;

-- ---------------------------------------------------------------------
-- 6. Opening lifecycle events (one "Registered" event per asset)
-- ---------------------------------------------------------------------
insert into public.lifecycle_events (
  asset_id, event_type, previous_status, new_status, remarks, performed_by_name, occurred_at
)
select a.id, 'Registered', null, a.lifecycle_status,
       'Asset migrated into the asset management system.',
       'System (data migration)',
       coalesce(a.commissioned_on::timestamptz, now() - interval '30 days')
from public.assets a
where not exists (
  select 1 from public.lifecycle_events le where le.asset_id = a.id
);

-- ---------------------------------------------------------------------
-- 7. A few inspections and maintenance records
-- ---------------------------------------------------------------------
insert into public.inspections (
  asset_id, inspected_on, condition, notes, recommended_action, inspector_name
)
select a.id, v.inspected_on::date, v.cond::public.condition_rating,
       v.notes, v.action, v.inspector
from (values
  ('HLT-HOS-0002', '2026-08-18', 'Critical',
   'Visible cracking along the east wing load bearing walls; seepage on the second floor.',
   'Commission a detailed structural audit and restrict occupancy of the east wing.',
   'Er. K. P. Shah'),
  ('RT-HW-0002', '2026-08-30', 'Poor',
   'Extensive rutting and potholes between chainage 12 km and 21 km.',
   'Mill and resurface the affected stretch before the monsoon.',
   'Er. M. J. Solanki'),
  ('RT-BR-0001', '2026-09-02', 'Fair',
   'Expansion joints worn; minor spalling on pier P7.',
   'Replace expansion joints and carry out patch repairs on P7.',
   'Er. S. D. Chauhan'),
  ('WR-CAN-0001', '2026-09-10', 'Good',
   'Lining intact along inspected reach; minor silt accumulation near the head regulator.',
   'Schedule routine desilting before the next irrigation season.',
   'Er. H. R. Vaghela')
) as v(asset_code, inspected_on, cond, notes, action, inspector)
join public.assets a on a.asset_code = v.asset_code
where not exists (
  select 1 from public.inspections i
  where i.asset_id = a.id and i.inspected_on = v.inspected_on::date
);

insert into public.maintenance_records (
  asset_id, status, assigned_officer, start_date, end_date, cost,
  description, next_maintenance_date
)
select a.id, v.status::public.maintenance_status, v.officer,
       v.start_date::date, nullif(v.end_date, '')::date, v.cost,
       v.description, nullif(v.next_date, '')::date
from (values
  ('RT-HW-0002', 'In Progress', 'Er. M. J. Solanki', '2026-09-05', '', 42000000.00,
   'Milling and bituminous resurfacing between chainage 12 km and 21 km.', '2027-09-05'),
  ('HLT-PHC-0002', 'In Progress', 'Dr. R. M. Bhatt', '2026-09-12', '', 2800000.00,
   'Roof waterproofing and complete electrical rewiring.', '2027-03-12'),
  ('RT-BR-0001', 'Scheduled', 'Er. S. D. Chauhan', '2026-10-01', '', 9500000.00,
   'Replacement of expansion joints and patch repair of pier P7.', '2027-10-01'),
  ('HLT-HOS-0001', 'Completed', 'Dr. A. V. Mehta', '2026-06-01', '2026-06-28', 5600000.00,
   'Annual servicing of HVAC plant and backup generators.', '2026-10-15'),
  ('EDU-SCH-0001', 'Completed', 'Shri V. P. Joshi', '2026-05-10', '2026-05-24', 1200000.00,
   'Repainting of classroom blocks and repair of boundary wall.', '2026-11-30')
) as v(asset_code, status, officer, start_date, end_date, cost, description, next_date)
join public.assets a on a.asset_code = v.asset_code
where not exists (
  select 1 from public.maintenance_records m
  where m.asset_id = a.id and m.description = v.description
);
